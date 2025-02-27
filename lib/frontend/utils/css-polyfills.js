// polyfill window.getMatchedCSSRules() in Chrome
if (typeof window.getMatchedCSSRules !== "function") {
    var ELEMENT_RE = /[\w-]+/g,
        ID_RE = /#[\w-]+/g,
        CLASS_RE = /\.[\w-]+/g,
        ATTR_RE = /\[[^\]]+\]/g,
        // :not() pseudo-class does not add to specificity, but its content does as if it was outside it
        PSEUDO_CLASSES_RE = /\:(?!not)[\w-]+(\(.*\))?/g,
        PSEUDO_ELEMENTS_RE =
            /\:\:?(after|before|first-letter|first-line|selection)/g;
    // convert an array-like object to array
    function toArray(list) {
        return [].slice.call(list);
    }

    const getStylesheets = function() {
        const sheets = document.styleSheets;
        const customsheets = [];
        for (const sheet of sheets) {
            if (sheet.href && (new URL(sheet.href).hostname !== new URL(location.href).hostname)) {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", sheet.href, false);
                xhr.send();
                const newSheet = new CSSStyleSheet({
                    baseURL: sheet.href,
                    media: sheet.media,
                    disabled: sheet.disabled
                });
                Object.defineProperties(newSheet, {
                    ownerNode: {
                        value: sheet.ownerNode,
                        writable: false
                    },
                    href: {
                        value: sheet.href,
                        writable: false
                    }
                })
                newSheet.replaceSync(xhr.responseText);
                customsheets.push(newSheet);
            } else {
                customsheets.push(sheet);
            }
        }
        return customsheets;
    }

    // handles extraction of `cssRules` as an `Array` from a stylesheet or something that behaves the same
    function getSheetRules(stylesheet) {
        var sheet_media = stylesheet.media && stylesheet.media.mediaText;
        // if this sheet is disabled skip it
        if (stylesheet.disabled) return [];
        // if this sheet's media is specified and doesn't match the viewport then skip it
        if (
            sheet_media &&
            sheet_media.length &&
            !window.matchMedia(sheet_media).matches
        )
            return [];
        // get the style rules of this sheet
        return toArray(stylesheet.cssRules);
    }

    function _find(string, re) {
        var matches = string.match(re);
        return re ? re.length : 0;
    }

    // calculates the specificity of a given `selector`
    function calculateScore(selector) {
        var score = [0, 0, 0],
            parts = selector.split(" "),
            part,
            match;
        //TODO: clean the ':not' part since the last ELEMENT_RE will pick it up
        while (((part = parts.shift()), typeof part == "string")) {
            // find all pseudo-elements
            match = _find(part, PSEUDO_ELEMENTS_RE);
            score[2] = match;
            // and remove them
            match && (part = part.replace(PSEUDO_ELEMENTS_RE, ""));
            // find all pseudo-classes
            match = _find(part, PSEUDO_CLASSES_RE);
            score[1] = match;
            // and remove them
            match && (part = part.replace(PSEUDO_CLASSES_RE, ""));
            // find all attributes
            match = _find(part, ATTR_RE);
            score[1] += match;
            // and remove them
            match && (part = part.replace(ATTR_RE, ""));
            // find all IDs
            match = _find(part, ID_RE);
            score[0] = match;
            // and remove them
            match && (part = part.replace(ID_RE, ""));
            // find all classes
            match = _find(part, CLASS_RE);
            score[1] += match;
            // and remove them
            match && (part = part.replace(CLASS_RE, ""));
            // find all elements
            score[2] += _find(part, ELEMENT_RE);
        }
        return parseInt(score.join(""), 10);
    }

    // returns the heights possible specificity score an element can get from a give rule's selectorText
    function getSpecificityScore(element, selector_text) {
        var selectors = selector_text.split(","),
            selector,
            score,
            result = 0;
        while ((selector = selectors.shift())) {
            if (element.webkitMatchesSelector(selector)) {
                score = calculateScore(selector);
                result = score > result ? score : result;
            }
        }
        return result;
    }

    function sortBySpecificity(element, rules) {
        // comparing function that sorts CSSStyleRules according to specificity of their `selectorText`
        function compareSpecificity(a, b) {
            return (
                getSpecificityScore(element, b.selectorText) -
                getSpecificityScore(element, a.selectorText)
            );
        }

        return rules.sort(compareSpecificity);
    }

    //TODO: not supporting 2nd argument for selecting pseudo elements
    //TODO: not supporting 3rd argument for checking author style sheets only
    window.getMatchedCSSRules = function (element /*, pseudo, author_only*/) {
        var style_sheets,
            sheet,
            sheet_media,
            rules,
            rule,
            result = [];
        // get stylesheets and convert to a regular Array
        style_sheets = toArray(getStylesheets());

        // assuming the browser hands us stylesheets in order of appearance
        // we iterate them from the beginning to follow proper cascade order
        while ((sheet = style_sheets.shift())) {
            // get the style rules of this sheet
            rules = getSheetRules(sheet);
            // loop the rules in order of appearance
            while ((rule = rules.shift())) {
                // if this is an @import rule
                if (rule.styleSheet) {
                    // insert the imported stylesheet's rules at the beginning of this stylesheet's rules
                    rules = getSheetRules(rule.styleSheet).concat(rules);
                    // and skip this rule
                    continue;
                }
                // if there's no stylesheet attribute BUT there IS a media attribute it's a media rule
                else if (rule.media) {
                    // insert the contained rules of this media rule to the beginning of this stylesheet's rules
                    rules = getSheetRules(rule).concat(rules);
                    // and skip it
                    continue;
                }
                //TODO: for now only polyfilling Gecko
                // check if this element matches this rule's selector
                if (element.webkitMatchesSelector(rule.selectorText)) {
                    // push the rule to the results set
                    result.push(rule);
                }
            }
        }
        // sort according to specificity
        return sortBySpecificity(element, result);
    };
}