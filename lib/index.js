import fs from 'fs'
import path from 'path'
import io from 'socket.io'
import ejs from 'ejs'
import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import expressDevtoolsFrontend from 'express-devtools-frontend'
import cors from 'cors'

import logger from './logger'
import Backend from './backend'
import { getDomain } from './utils'

export const DEFAULT_HOST = '0.0.0.0'
export const DEFAULT_PORT = 9222

const SCRIPT_PATH = path.resolve(__dirname, 'scripts')
const VIEWS_PATH = path.resolve(__dirname, '..', 'views')
const PAGES_TPL_PATH = path.resolve(VIEWS_PATH, 'pages.tpl.html')

export default class DevtoolsBackend {
    constructor (host = DEFAULT_HOST, port = DEFAULT_PORT) {
        this.host = host
        this.port = port
        this.log = logger()
        this.pages = []

        this.app = express()

        /**
         * check runtime conditions
         */
        this.preflightCheck()

        /**
         * initialise external middleware
         */
        this.app.use(bodyParser.urlencoded({ extended: false }))
        this.app.use(bodyParser.json())
        this.app.set('view engine', 'ejs')
        this.app.set('views', VIEWS_PATH)
        this.app.engine('html', ejs.renderFile)
        this.app.use(cookieParser())

        /**
         * enable cors
         */
        this.app.use(cors({
            origin: "*",
            credentials: true
        }))
        this.app.disable('etag')

        /**
         * paths
         */
        this.app.get('/', this.inspectablePages.bind(this))
        this.app.get('/json', this.json.bind(this))
        this.app.post('/register', this.register.bind(this))
        this.app.use('/devtools', expressDevtoolsFrontend)
        this.app.use('/scripts', express.static(SCRIPT_PATH))

        /**
         * initialise socket server
         */
        this.server = this.app.listen(this.port,
            () => this.log.info(`Started devtools-backend server on ${this.host}:${this.port}`))

        /**
         * initialise socket.io server
         * this connection manages web socket traffic between frontend scripts and devtools-backend
         */
        this.io = io(this.server, { 
            cors: {
                origin: "*",
                credentials: true
            }
        })
        this.io.on('connection', (socket) => {
            socket.on('log', (args) => console.log.apply(console, args)) // dev debugging only
            socket.on('error:injectScript', (e) => this.log.error(e))
        })

        /**
         * initialise Websocket Server
         * this connection manages web socket traffic between devtools-frontend and devtools-backend
         */
        this.backend = new Backend(this.io)
        this.server.on('upgrade', this.backend.upgradeWssSocket.bind(this.backend))
    }

    /**
     * Backend and Proxy share the same port, make sure we only proxy requests that are not
     * requested on port 9222. These requests are reserved for Backend specific pages
     */
    filterRequests (view) {
        return (req, res, next) => {
            return view(req, res, next)
        }
    }

    inspectablePages (req, res, next) {
        return res.sendFile(PAGES_TPL_PATH)
    }

    register (req, res) {
        /**
         * make sure response is not being cached
         */
        res.header('Surrogate-Control', 'no-store')
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
        res.header('Pragma', 'no-cache')
        res.header('Expires', '0')

        this.backend.addPage(req.body)
        return res.json({})
    }

    json (req, res) {
        res.setHeader('Content-Type', 'application/json')
        return res.send(JSON.stringify(this.backend.pages.map((page) => {
            const devtoolsPath = `${page.hostname}/devtools/page/${page.uuid}`
            const title = page.title || getDomain(page.url)
            return {
                description: page.description,
                devtoolsFrontendUrl: `/devtools/devtools_app.html?wss=${devtoolsPath}`,
                title,
                type: 'page',
                url: page.url.href,
                metadata: page.metadata,
                webSocketDebuggerUrl: `wss://${devtoolsPath}`
            }
        }), null, 2))
    }

    preflightCheck () {
        /**
         * preflight check: devtools-frontend was build
         */
        if (!expressDevtoolsFrontend) {
            throw new Error('Devtools Frontend not found. Run `npm i express-devtools-frontend` to install.')
        }
    }
}

if (require.main === module) {
    new DevtoolsBackend() // eslint-disable-line no-new
}
