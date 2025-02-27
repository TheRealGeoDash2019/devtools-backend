import xhr from 'xhr'

const flatten = arr => arr.reduce(
    (acc, val) => acc.concat(
        Array.isArray(val) ? flatten(val) : val
    ),
    []
)

export function getAttributes (namedNodeMap) {
    /**
     * ensure text nodes aren't accidentely being parsed for attributes
     */
    if (!namedNodeMap) {
        return
    }

    const attributes = namedNodeMap.toArray().map((attr) => [attr.name, attr.value])
    return flatten(attributes)
}

/**
 * get origin of backend depending on whether scripts get injected or referenced
 * by launcher
 */
export function getDriverOrigin () {
    /**
     * check if executed by launcher script
     */
    if (document.currentScript && document.currentScript.src) {
        return new URL(document.currentScript.src).origin;
    }

    if (document.currentScript && document.currentScript.getAttribute('data-proxy-host')) {
        return `https://${document.currentScript.getAttribute('data-proxy-host')}`
    }

    if (window._proxyHost) {
        return window._proxyHost
    }

    return 'http://localhost:9222'
}

export function getTitle () {
    /**
     * get document title
     */
    let title = ''
    const titleTag = document.querySelector('title')
    if (titleTag) {
        title = titleTag.text
    } else if ("title" in document) {
        title = document.title;
    }

    return title
}

export function getDescription () {
    /**
     * get document description
     */
    let description = ''
    const metaTags = document.querySelectorAll('meta')
    for (let i = 0; i < metaTags.length; ++i) {
        const tag = metaTags[i]
        if (tag.getAttribute('name') !== 'description') {
            continue
        }

        description = tag.getAttribute('content')
    }

    return description
}

/**
 * simple wrapper to do POST request with xhr
 */
export function request (url, json) {
    return new Promise((resolve, reject) => {
        xhr.post({
            url,
            json,
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        }, (err, res) => {
            if (err) {
                return reject(err)
            }

            return resolve(res)
        })
    })
}
