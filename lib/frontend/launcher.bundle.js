import Promise from 'promise-polyfill'
import './utils/css-polyfills'

import { getTitle, getDescription, request } from './utils/common'
import RemoteDebugger from './remoteDebugger'

window.io = require('../../node_modules/socket.io/client-dist/socket.io')

const NOOP = () => {}

window.MutationObserver = window.MutationObserver ||
    window.WebKitMutationObserver ||
    window.MozMutationObserver

/**
 * set Promise polyfill if not existent
 * (required for webdriver executeAsync command)
 */
if (!window.Promise) {
    window.Promise = Promise
}

const program = function () {
    const currentScript = document.currentScript || [].slice.call(document.querySelectorAll('script')).filter(
        (script) => script.getAttribute('src') && script.getAttribute('src').indexOf('launcher.js') > -1
    )[0]
    const devtoolsBackendHost = new URL(currentScript.src).hostname;
    const uuid = currentScript.getAttribute('data-uuid') || crypto.randomUUID();

    /**
     * register TV
     */
    const { appName, appCodeName, appVersion, product, platform, vendor, userAgent } = navigator
    const description = getDescription()
    const title = getTitle()
    request(`https://${devtoolsBackendHost}/register`, {
        uuid,
        url: document.location.href,
        description,
        title,
        hostname: devtoolsBackendHost,
        metadata: { appName, appCodeName, appVersion, product, platform, vendor, userAgent }
    })

    const remoteDebugger = window.remoteDebugger = new RemoteDebugger(uuid)

    /**
     * trigger executionContextCreated event
     */
    const origOnReadyStateChange = document.onreadystatechange || NOOP
    document.onreadystatechange = function () {
        if (document.readyState === 'complete') {
            remoteDebugger.loadHandler()
        }

        origOnReadyStateChange()
    }

    const origOnError = window.onerror || NOOP
    window.onerror = function (errorMsg, url, lineNumber) {
        console.error(errorMsg)
        origOnError(errorMsg, url, lineNumber)
    }
}

try {
    program()
} catch (error) {
    console.error('Something went wrong connecting to devtools backend:', error.message)
}
