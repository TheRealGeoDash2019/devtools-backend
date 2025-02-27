import domains from './domains'
import CSSStore from './models/CSSStore'
import { setNodeIds } from './utils/dom'
import { getTitle, getDescription, getDriverOrigin } from './utils/common'

const SUPPORTED_DOMAINS = Object.keys(domains)

/**
 * Pure implementation of the Chrome Remote Debugger Protocol (tip-of-tree) in JavaScript
 */
export default class RemoteDebugger {
    constructor (uuid) {
        this.uuid = uuid
        this.host = getDriverOrigin()
        this.domains = {}
        this.requestId = this.getCookie('requestId') || '1.1' // set to 1.1 in case Network domain is disabled
        this.executionContextId = parseInt(this.requestId.split('.')[0])
        this.frameId = this.getCookie('frameId') || '1.0' // set to 1.0 in case Network domain is disabled
        this.socket = window.io(`${this.host}/page/${uuid}`)
        this.readyStateComplete = false

        const { appName, appCodeName, appVersion, product, platform, vendor, userAgent } = navigator
        const description = getDescription()
        const title = getTitle()
        this.emit('connection', {
            status: 'established',
            supportedDomains: SUPPORTED_DOMAINS,
            info: {
                url: document.location.href,
                description,
                title,
                frameId: this.frameId,
                metadata: { appName, appCodeName, appVersion, product, platform, vendor, userAgent }
            }
        })

        for (let [name, domain] of Object.entries(domains)) {
            this.domains[name] = domain
            this.socket.on(name, (args) => this.dispatchEvent(domain, args))
        }

        /**
         * overwrite console object
         */
        window.console = domains.Runtime.overwriteConsole.call(this, window.console)
        this.cssStore = new CSSStore(this.requestId)
        this.openDevtools();
    }

    openDevtools() {
        const devtoolsHost = new URL(this.host);
        const devtoolsUrl = new URL("/devtools/devtools_app.html", devtoolsHost).href;
        const devtoolsWSUrl = `?wss=${devtoolsHost.hostname}/devtools/page/${this.uuid}`;
        window.open(devtoolsUrl + devtoolsWSUrl, "_blank", "popup=1");
    }

    emit (event, payload) {
        return this.socket.emit(event, payload)
    }

    dispatchEvent (target, args) {
        this.emit('debug', 'received: ' + JSON.stringify(args).slice(0, 1000))

        let result
        const method = target[args.method]

        if (!method) {
            return this.emit('result', {
                id: args.id,
                error: `Method "${args.method}" not found`
            })
        }

        try {
            result = method.call(this, args.params, args.id)
        } catch (e) {
            this.emit('debug', { message: e.message, stack: e.stack.slice(0, 1000) })
            return
        }

        if (!result) {
            this.emit('debug', `no result for method "${method.name}"`)
            return
        }

        this.emit('result', {
            id: args.id,
            result,
            _method: args.method,
            _domain: args.domain
        })
    }

    execute (method, params) {
        this.emit('result', { method, params })
    }

    getCookie (n) {
        let a = `; ${document.cookie}`.match(`;\\s*${n}=([^;]+)`)
        return a ? a[1] : ''
    }

    loadHandler () {
        this.readyStateComplete = true
        this.domains.Runtime.executionContextCreated.call(this)
        this.domains.Debugger.scriptParsed.call(this)
        this.domains.Page.frameStoppedLoading.call(this)
        this.domains.Page.loadEventFired.call(this)
        this.domains.DOM.documentUpdated.call(this)

        /**
         * assign nodeIds to elements
         */
        setNodeIds(document)
    }
}
