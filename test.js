window.onload = () => setTimeout(function () {
    let assert = (condition, message) => {
        if (!condition) throw Error(message);
    };

    let mix = (y0, y1, x, x0 = 0, x1 = 1) => {
        // y0 -> f(x=0); y1 -> f(x=1); return y -> f(x)
        assert(x0 < x1, 'expect x0 < x1');
        x = (x - x0) / (x1 - x0);
        return y0 * (1 - x) + y1 * x;
    };

    let inStringListFunc = (list) => {
        let hash = {};
        for (let element of list) hash[element] = true;
        return (element) => hash[element] === true;
    };

    // as in C ispunct
    let isPunct = inStringListFunc('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
    let isSpace = inStringListFunc(' \n\t\v\f\r');
    let isDigit = inStringListFunc('0123456789');

    let parseInteger = (string, index = 0, char = string[index]) => {
        // actually unsigned
        if (!isDigit(char)) return;
        let num = 0;
        while (index < string.length) {
            num = num * 10 + (char | 0);
            char = string[++index];
            if (!isDigit(char)) break;
        }
        return [index, num];
    };

    let parseNumber = (string, index = 0, char = string[index]) => {
        let ret;
        let sign = 1, num = 0;
        if (char == '+' || char == '-') {
            if (char == '-') sign = -1;
            index++;
            char = string[index];
        }
        let valid = false;
        if (ret = parseInteger(string, index, char)) {
            [index, num] = ret;
            char = string[index];
            valid = true;
        }
        if (char == '.') {
            index++;
            char = string[index];
            if (ret = parseInteger(string, index, char)) {
                let startIndex = index;
                let decimal;
                [index, decimal] = ret;
                num += decimal / 10 ** (index - startIndex);
                valid = true;
            }
        }
        if (!valid) return;
        num = sign * num;
        return [index, num];
    };

    let parseWord = (string, index = 0, char = string[index]) => {
        if (isDigit(char) || isPunct(char) || isSpace(char)) return;
        let startIndex = index;
        while (index < string.length) {
            char = string[++index];
            if (isPunct(char) || isSpace(char)) break;
        }
        let word = string.slice(startIndex, index);
        return [index, word];
    };

    const PX = 1;
    const CM = 96 / 2.54;
    const MM = CM / 10;
    const Q = CM / 40;
    const IN = 96;
    const PC = IN / 6;
    const PT = IN / 72;

    const absoluteUnits = {
        'cm': CM,
        'mm': MM,
        'Q': Q,
        'in': IN,
        'pc': PC,
        'pt': PT,
        'px': PX,
    };

    let defaultUnit = 'px';

    const noSupport = (name, element, document, window) => assert(false, 'no support yet');
    const relativeUnits = {
        'em': (name, element, document, window) => {
            if (name == 'fontSize' || name == 'font-size') {
                return MeasuredValue.parse(getComputedStyle(element.parentElement).fontSize).toUnit().value;
            }
            return MeasuredValue.parse(getComputedStyle(element).fontSize).toUnit().value;
        },
        'ex': noSupport,
        'ch': noSupport,
        'rem': (name, element, document, window) => {
            return MeasuredValue.parse(getComputedStyle(document.documentElement).fontSize).toUnit().value;
        },
        'lh': (name, element, document, window) => {
            return MeasuredValue.parse(getComputedStyle(element).lineHeight).toUnit().value;
        },
        'rlh': (name, element, document, window) => {
            return MeasuredValue.parse(getComputedStyle(document.documentElement).lineHeight).toUnit().value;
        },
        'vw': (name, element, document, window) => window.innerWidth * 0.01,
        'vh': (name, element, document, window) => window.innerHeight * 0.01,
        'vmin': (name, element, document, window) => Math.min(window.innerWidth, window.innerHeight) * 0.01,
        'vmax': (name, element, document, window) => Math.max(window.innerWidth, window.innerHeight) * 0.01,
        'vb': noSupport,
        'vi': noSupport,
        'svw': noSupport,
        'svh': noSupport,
        'lvw': noSupport,
        'lvh': noSupport,
        'dvw': noSupport,
        'dvh': noSupport,
        '%': (name, element, document, window) => {
            if (name == 'left' || name == 'right' || name == 'width')
                return element.offsetParent.clientWidth * 0.01;
            if (name == 'top' || name == 'bottom' || name == 'height')
                return element.offsetParent.clientHeight * 0.01;
            if (name == 'fontSize' || name == 'font-size' || name == 'lineHeight' || name == 'line-height')
                return MeasuredValue.parse(getComputedStyle(element.parentElement).fontSize).toUnit().value * 0.01;
            return element.offsetParent.clientWidth * 0.01;
        },
    };

    let getUnitValue = (unit, name, element, document = element?.ownerDocument, window = document?.defaultView) => {
        if (Object.hasOwn(absoluteUnits, unit))
            return absoluteUnits[unit];

        if (Object.hasOwn(relativeUnits, unit))
            return relativeUnits[unit](name, element, document, window);
    };


    class MeasuredValue {
        static absoluteUnits = absoluteUnits;

        static parse(string, partial = false) {
            let ret = parseValue(string);
            if (!ret) return;
            let [index, value] = ret;
            if (partial || index == string.length) return value;
        }

        static mix(a, b, percentage, unitValue, defaultUnit) {
            let value, unit;
            if (a.unit != b.unit && a.unit && b.unit) {
                value = mix(a.toUnit(defaultUnit, unitValue).value, b.toUnit(defaultUnit, unitValue).value, percentage);
                unit = defaultUnit;
            } else {
                value = mix(a.value, b.value, percentage);
                unit = a.unit || b.unit;
            }
            return new MeasuredValue(value, unit);
        }

        constructor(value, unit) {
            this.value = value;
            this.unit = unit;
        }

        toUnit(unit = defaultUnit, getUnitValue) {
            if (getUnitValue) {
                return new MeasuredValue(this.value * getUnitValue(this.unit) / getUnitValue(unit), unit);
            }
            return new MeasuredValue(this.value * absoluteUnits[this.unit] / absoluteUnits[unit], unit);
        }

        toString() {
            return this.value + this.unit;
        }
    };

    let parseValue = (string, index = 0, char = string[index]) => {
        let ret = parseNumber(string, index, char);
        if (!ret) return;
        let num, unit;
        [index, num] = ret;
        char = string[index];
        if (char == '%') {
            index++;
            unit = '%';
        } else if (ret = parseWord(string, index, char)) {
            [index, unit] = ret;
        }
        return [index, new MeasuredValue(num, unit)];
    };

    console.log('toUnit:', MeasuredValue.parse('1cm').toUnit('px'));

    let parseAll = (string, index = 0, char = string[index]) => {
        // makes no assumption on syntax of the text excluing the values
        let ret;
        let values = [];
        let startIndex = index;
        while (index < string.length) {
            if (ret = parseValue(string, index, char)) {
                if (startIndex < index) values.push(string.slice(startIndex, index));
                let value;
                [index, value] = ret;
                char = string[index];
                values.push(value);
                startIndex = index;
            } else if (ret = parseColor(string, index, char)) {
                if (startIndex < index) values.push(string.slice(startIndex, index));
                let color;
                [index, color] = ret;
                char = string[index];
                values.push(color);
                startIndex = index;
            } else if (ret = parseWord(string, index, char)) {
                if (startIndex < index) values.push(string.slice(startIndex, index));
                let word;
                [index, word] = ret;
                char = string[index];
                values.push(word);
                startIndex = index;
            } else {
                index++;
                char = string[index];
            }
        }
        if (startIndex < index) values.push(string.slice(startIndex, index));
        return values;
    };

    let parseKeywords = (string, index = 0, char = string[index], keywords) => {
        let ret = parseWord(string, index, char);
        if (!ret) return;
        let keyword;
        [index, keyword] = ret;
        if (!keywords.includes(keyword)) return;
        return [index, keyword];
    };

    let parsePunctuator = (string, index = 0, char = string[index], punctuator) => {
        let i = 0;
        while (index < string.length) {
            if (punctuator[i] != char) break;
            i++;
            char = string[++index];
        }
        if (i != punctuator.length) return;
        return [index, punctuator];
    };

    let parseSpaces = (string, index = 0, char = string[index]) => {
        let startIndex = index;
        while (index < string.length) {
            if (!isSpace(char)) break;
            char = string[++index];
        }
        if (startIndex == index) return;
        let spaces = string.slice(startIndex, index);
        return [index, spaces];
    };

    let parseValues = (string, index = 0, char = string[index], separator, parseValue) => {
        let ret;
        let values = [];
        while (true) {
            if (values.length > 0) {
                if (ret = parseSpaces(string, index, char)) {
                    [index] = ret;
                    char = string[index];
                }
                if (ret = parsePunctuator(string, index, char, separator)) {
                    [index] = ret;
                    char = string[index];
                } else {
                    break;
                }
            }
            if (ret = parseSpaces(string, index, char)) {
                [index] = ret;
                char = string[index];
            }
            ret = parseValue(string, index, char);
            if (!ret) break;
            let value;
            [index, value] = ret;
            char = string[index];
            values.push(value);
        }
        return [index, values];
    };

    class Color {
        #length;
        constructor(channel) {
            this.#length = channel;
        }

        clone() {
            return new Color();
        }
    }

    class RGBColor extends Color {
        static mix(a, b, percentage) {
            return new RGBColor(mix(a.r, b.r, percentage), mix(a.g, b.g, percentage), mix(a.b, b.b, percentage));
        }

        type = 'rgb';

        constructor(r, g, b) {
            super(3);
            this.r = r;
            this.g = g;
            this.b = b;
        }

        clone() {
            return new RGBColor(this.r, this.g, this.b);
        }

        toString() {
            let { r, g, b } = this;
            return `rgb(${r}, ${g}, ${b})`;
        }

        toRGBA() {
            return new RGBAColor(this.r, this.g, this.b, 1);
        }
    }

    class RGBAColor extends Color {
        static mix(a, b, percentage) {
            return new RGBAColor(mix(a.r, b.r, percentage), mix(a.g, b.g, percentage), mix(a.b, b.b, percentage), mix(a.a, b.a, percentage));
        }

        type = 'rgba';

        constructor(r, g, b, a) {
            super(4);
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
        }

        clone() {
            return new RGBAColor(this.r, this.g, this.b, this.a);
        }

        toString() {
            let { r, g, b, a } = this;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }

        toRGBA() {
            return new RGBAColor(this.r, this.g, this.b, this.a);
        }
    }

    let isHexDigit = inStringListFunc('0123456789abcdefABCDEF');
    let parseHexColor = (string, index = 0, char = string[index]) => {
        if (char != '#') return;
        let startIndex = index;
        index++;
        while (index < string.length && index - startIndex <= 8) {
            char = string[index];
            if (!isHexDigit(char)) break;
            index++;
        }
        let hex = string.slice(startIndex + 1, index);
        let len = hex.length;
        let color;
        if (len == 8) {
            color = new RGBAColor(hexToNum(hex, 0, 2), hexToNum(hex, 2, 4), hexToNum(hex, 4, 6), hexToNum(hex, 6, 8) / 255);
        } else if (len >= 6) {
            color = new RGBColor(hexToNum(hex, 0, 2), hexToNum(hex, 2, 4), hexToNum(hex, 4, 6));
        } else if (len >= 4) {
            color = new RGBAColor(hexToNum(hex, 0, 1) * 17, hexToNum(hex, 1, 2) * 17, hexToNum(hex, 2, 3) * 17, hexToNum(hex, 3, 4) * 17 / 255);
        } else if (len == 3) {
            color = new RGBColor(hexToNum(hex, 0, 1) * 17, hexToNum(hex, 1, 2) * 17, hexToNum(hex, 2, 3) * 17);
        } else return;
        return [index, color];
    };

    let hexCode = { 0: 0, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15, A: 10, B: 11, C: 12, D: 13, E: 14, F: 15 };
    let hexToNum = (hex, startIndex = 0, lastIndex = hex.length) => {
        let num = 0;
        for (let i = startIndex; i < lastIndex; i++) {
            num = num * 16 + hexCode[hex[i]];
        }
        return num;
    };

    const colorKeywords = ['rgba', 'rgb'];
    let parseColorFunction = (string, index = 0, char = string[index]) => {
        let ret = parseKeywords(string, index, char, colorKeywords);
        if (!ret) return;
        let keyword;
        [index, keyword] = ret;
        char = string[index];
        ret = parsePunctuator(string, index, char, '(');
        if (!ret) return;
        [index] = ret;
        char = string[index];
        ret = parseValues(string, index, char, ',', parseNumber);
        let params;
        if (ret) {
            [index, params] = ret;
            char = string[index];
        } else {
            params = [];
        }
        ret = parsePunctuator(string, index, char, ')');
        if (!ret) return;
        [index] = ret;
        let color;
        if (keyword == 'rgba') {
            if (params.length != 4) return;
            color = new RGBAColor(...params);
        } else if (keyword == 'rgb') {
            if (params.length != 3) return;
            color = new RGBColor(...params);
        } else {
            color = [keyword, params];
        }
        return [index, color];
    };

    let CSS1 = { black: '#000000', silver: '#c0c0c0', gray: '#808080', white: '#ffffff', maroon: '#800000', red: '#ff0000', purple: '#800080', fuchsia: '#ff00ff', green: '#008000', lime: '#00ff00', olive: '#808000', yellow: '#ffff00', navy: '#000080', blue: '#0000ff', teal: '#008080', aqua: '#00ffff' };
    let CSS2 = { orange: '#ffa500' };
    let CSS3 = { aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aquamarine: '#7fffd4', azure: '#f0ffff', beige: '#f5f5dc', bisque: '#ffe4c4', blanchedalmond: '#ffebcd', blueviolet: '#8a2be2', brown: '#a52a2a', burlywood: '#deb887', cadetblue: '#5f9ea0', chartreuse: '#7fff00', chocolate: '#d2691e', coral: '#ff7f50', cornflowerblue: '#6495ed', cornsilk: '#fff8dc', crimson: '#dc143c', cyan: '#00ffff', darkblue: '#00008b', darkcyan: '#008b8b', darkgoldenrod: '#b8860b', darkgray: '#a9a9a9', darkgreen: '#006400', darkgrey: '#a9a9a9', darkkhaki: '#bdb76b', darkmagenta: '#8b008b', darkolivegreen: '#556b2f', darkorange: '#ff8c00', darkorchid: '#9932cc', darkred: '#8b0000', darksalmon: '#e9967a', darkseagreen: '#8fbc8f', darkslateblue: '#483d8b', darkslategray: '#2f4f4f', darkslategrey: '#2f4f4f', darkturquoise: '#00ced1', darkviolet: '#9400d3', deeppink: '#ff1493', deepskyblue: '#00bfff', dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1e90ff', firebrick: '#b22222', floralwhite: '#fffaf0', forestgreen: '#228b22', gainsboro: '#dcdcdc', ghostwhite: '#f8f8ff', gold: '#ffd700', goldenrod: '#daa520', greenyellow: '#adff2f', grey: '#808080', honeydew: '#f0fff0', hotpink: '#ff69b4', indianred: '#cd5c5c', indigo: '#4b0082', ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa', lavenderblush: '#fff0f5', lawngreen: '#7cfc00', lemonchiffon: '#fffacd', lightblue: '#add8e6', lightcoral: '#f08080', lightcyan: '#e0ffff', lightgoldenrodyellow: '#fafad2', lightgray: '#d3d3d3', lightgreen: '#90ee90', lightgrey: '#d3d3d3', lightpink: '#ffb6c1', lightsalmon: '#ffa07a', lightseagreen: '#20b2aa', lightskyblue: '#87cefa', lightslategray: '#778899', lightslategrey: '#778899', lightsteelblue: '#b0c4de', lightyellow: '#ffffe0', limegreen: '#32cd32', linen: '#faf0e6', magenta: '#ff00ff', mediumaquamarine: '#66cdaa', mediumblue: '#0000cd', mediumorchid: '#ba55d3', mediumpurple: '#9370db', mediumseagreen: '#3cb371', mediumslateblue: '#7b68ee', mediumspringgreen: '#00fa9a', mediumturquoise: '#48d1cc', mediumvioletred: '#c71585', midnightblue: '#191970', mintcream: '#f5fffa', mistyrose: '#ffe4e1', moccasin: '#ffe4b5', navajowhite: '#ffdead', oldlace: '#fdf5e6', olivedrab: '#6b8e23', orangered: '#ff4500', orchid: '#da70d6', palegoldenrod: '#eee8aa', palegreen: '#98fb98', paleturquoise: '#afeeee', palevioletred: '#db7093', papayawhip: '#ffefd5', peachpuff: '#ffdab9', peru: '#cd853f', pink: '#ffc0cb', plum: '#dda0dd', powderblue: '#b0e0e6', rosybrown: '#bc8f8f', royalblue: '#4169e1', saddlebrown: '#8b4513', salmon: '#fa8072', sandybrown: '#f4a460', seagreen: '#2e8b57', seashell: '#fff5ee', sienna: '#a0522d', skyblue: '#87ceeb', slateblue: '#6a5acd', slategray: '#708090', slategrey: '#708090', snow: '#fffafa', springgreen: '#00ff7f', steelblue: '#4682b4', tan: '#d2b48c', thistle: '#d8bfd8', tomato: '#ff6347', transparent: '#0000', turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3', whitesmoke: '#f5f5f5', yellowgreen: '#9acd32' };
    let CSS4 = { rebeccapurple: '#663399' };
    let namedHexColors = { ...CSS1, ...CSS2, ...CSS3, ...CSS4 };
    let namedColors = Object.fromEntries(Object.entries(namedHexColors).map(([key, value]) => [key, parseHexColor(value)[1]]));

    // console.log(namedColors);

    let parseNamedColor = (string, index = 0, char = string[index]) => {
        let ret = parseWord(string, index, char);
        if (!ret) return;
        let name;
        [index, name] = ret;
        if (!Object.hasOwn(namedColors, name)) return;
        return [index, namedColors[name]];
    };

    let parseColor = (string, index = 0, char = string[index]) => {
        return parseHexColor(string, index, char) || parseColorFunction(string, index, char) || parseNamedColor(string, index, char);
    };

    let matchFormat = (a, b) => {
        if (a.length != b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (typeof a[i] == 'string' && a[i] != b[i]) return false;
        }
        return true;
    };

    // let cssName = name => name.replace(/-./g, match => match[1].toUpperCase());
    // console.log(cssName('z-index'));

    let getKeyframes = (() => {

        let inRange = (min, max) => (n) => min <= n && n <= max;
        let unique = (elem, ind, arr) => arr.indexOf(elem) == ind;
        let and = (arr) => (elem, ind) => elem && arr[ind];
        let masked = (arr) => (_, ind) => arr[ind];
        let get = (arr) => (ind) => arr[ind];
        let key = (func) => (a, b) => func(a) - func(b);

        let argsort = (arr) => [...arr.keys()].sort(key(get(arr)));

        let getKeyframes = (keys, values) => {
            let times = keys.map(Number);
            let mask = times.map(inRange(0, 1)).map(and(times.map(unique)));
            let props = values.filter(masked(mask));
            times = times.filter(masked(mask));
            let argsorted = argsort(times);

            times = argsorted.map(get(times));
            props = argsorted.map(get(props)).map((props) => {
                let out = {};
                for (let key of Object.keys(props)) {
                    out[key] = parseAll(props[key])
                }
                return out;
            });


            return [times, props];
        };

        return getKeyframes;
    })();

    class Animator {
        // default
        #request = step => requestAnimationFrame(step);
        #cancel = id => cancelAnimationFrame(id);

        #progress = 0;
        #frameId = -1;
        #prevTimestamp = -1;

        duration;

        constructor(duration) {
            this.duration = duration;
        }

        #step(timestamp) {
            if (this.#prevTimestamp != -1) {
                this.#progress = Math.min(1, this.#progress + (timestamp - this.#prevTimestamp) / this.duration);
            }
            this.update(this.#progress);
            if (this.#progress < 1) {
                this.#prevTimestamp = timestamp;
                this.#frameId = this.#request(timestamp => this.#step(timestamp));
            } else {
                this.#resolve?.(this);
                this.#resolve = undefined;
            }
        }

        get progress() {
            return this.#progress;
        }

        set progress(progress) {
            this.#progress = Math.max(0, Math.min(1, progress));
        }

        update(progress) {
            console.log(progress);
        }

        play() {
            if (this.#frameId == -1) {
                this.#prevTimestamp = -1;
                this.#frameId = this.#request(timestamp => this.#step(timestamp));
            }
            return this;
        }

        pause() {
            if (this.#frameId != -1) {
                this.#cancel(this.#frameId);
                this.#frameId = -1;
            }
            return this;
        }

        restart() {
            this.#progress = 0;
            this.pause().play();

            // if restart() is called before the end, previous then() will not execute
            delete this.then;

            return this;
        }

        stop() {
            this.pause();
            this.update(this.#progress = 0);

            this.#reject?.(this);
            this.#reject = undefined;
        }

        #resolve;
        #reject;
        then(resolve, reject) {
            this.#resolve = resolve;
            this.#reject = reject;

            this.then = undefined;
        }
    }

    class Animation extends Animator {

        // params
        #timeline;
        #defaultUnit = 'px';

        #element;

        constructor(keyframes, params = {}) {

            let { duration = 1000, element, onUpdate } = params;

            super(duration);

            this.#element = element;

            let [markers, states] = getKeyframes(Object.keys(keyframes), Object.values(keyframes));

            let keys = new Set(states.flatMap(Object.keys));
            // console.log(keys);
            console.log(markers, states);

            let timeline = {};
            for (let key of keys) {
                let times = [], values = [];
                for (let i = 0; i < markers.length; i++) {
                    if (Object.hasOwn(states[i], key)) {
                        times.push(markers[i]);
                        values.push(states[i][key]);
                    }
                }
                timeline[key] = new Keyframes(times, values, unit => getUnitValue(unit, key, this.#element), this.#defaultUnit);
            }
            console.log('timeline:', timeline);

            this.#timeline = timeline;

            this.onUpdate = onUpdate;
        }

        update(time) {
            let state = {};
            for (let [key, keyframes] of Object.entries(this.#timeline)) {
                state[key] = keyframes.getValueAt(time);
            }
            let cssProperties = Object.fromEntries(Object.entries(state).map(([key, value]) => [key, value.join('')]));
            // console.log(cssProperties, state);
            Object.assign(this.#element.style, cssProperties);
            this.onUpdate?.(time);
        }
    }

    let interp = (lvalue, rvalue, percentage, unitValue, defaultUnit) => {
        let value;
        if (typeof lvalue == 'string') {
            value = lvalue;
        } else if (lvalue instanceof MeasuredValue) {
            value = MeasuredValue.mix(lvalue, rvalue, percentage, unitValue, defaultUnit);
        } else if (lvalue instanceof Color) {
            if (lvalue.type == rvalue.type) {
                value = lvalue.constructor.mix(lvalue, rvalue, percentage);
            } else {
                value = RGBAColor.mix(lvalue.toRGBA(), rvalue.toRGBA(), percentage);
            }
        } else {
            throw Error("this is not supposed to happen");
        }
        return value;
    };

    class Keyframes {
        constructor(times, values, unitValue) {
            this.times = times;
            this.values = values;
            this.unitValue = unitValue;
            this.defaultUnit = defaultUnit;
        }

        getValueAt(time, unitValue = this.unitValue, defaultUnit = this.defaultUnit) {
            let { times, values } = this;
            if (time <= times[0]) return values[0];
            if (time >= times[times.length - 1]) return values[values.length - 1];

            let pivot = 0;
            for (; pivot < times.length && times[pivot] < time; pivot++);

            if (time == times[pivot - 1]) return values[pivot - 1];
            if (time == times[pivot]) return values[pivot];

            let value = [];
            let lvalues = values[pivot - 1], rvalues = values[pivot];

            let ltime = times[pivot - 1], rtime = times[pivot];
            let percentage = (time - ltime) / (rtime - ltime);

            for (let i = 0; i < lvalues.length; i++) {
                value.push(interp(lvalues[i], rvalues[i], percentage, unitValue, defaultUnit));
            }

            return value;
        }

        toString() {
            let { times, values } = this;
            let string = '';
            for (let i = 0; i < times.length; i++) {
                if (i > 0) string += ', ';
                string += times[i] + ': \'' + values[i].join('') + '\'';
            }
            string = '{' + string + '}';
            return string;
        }
    };

    let element = document.getElementById('item');
    console.log(element);

    let restart = document.getElementById('restart');
    let play = document.getElementById('play');
    let pause = document.getElementById('pause');
    let progress = document.getElementById('progress');

    let animation = new Animation({
        from: { ok: '?' },
        '': { asd: 5 },
        0: { left: '0px', width: '10vw', height: '100px', outline: '1px solid yellow', border: '1px solid darkblue', opacity: '0.0' },
        0.1: { background: 'linear-gradient(45deg, red, blue)' },
        0.2: { top: '0px', 'box-shadow': '0 0 0 0 red' },
        0.5: { left: '20%', height: '40%', top: '5vh', width: '200px' },
        0.7: { marginTop: '0px', 'box-shadow': '0px 0px 10px 10px #f0b' },
        0.9: { marginTop: '50px', marginLeft: '1px', background: 'linear-gradient(135deg, orange, cyan)' },
        1: { left: '100px', width: '300px', border: '0.5cm solid red', outline: '.5em solid rgb(0,200,100)', opacity: '1.0' },
    }, {
        element: element,
        duration: 2000,
        onUpdate: (time) => progress.value = time,
    });

    animation.play();
    console.log(animation);

    restart.onclick = () => Promise.resolve(animation.restart()).then(() => console.log('restart by button'));
    play.onclick = () => animation.play();
    pause.onclick = () => animation.pause();
    progress.oninput = () => {
        animation.pause();
        animation.update(animation.progress = progress.value);
    };

    Promise.resolve(animation).then((data) => {
        console.log(1, data);
        return data.restart();
    }).then((data) => {
        console.log(2, data);
        return data.restart();
    }).then((data) => {
        console.log(3, data);
    }).catch(e => {
        console.log('stop in the middle:', e);
    });

    setTimeout(() => {
        console.log('animation.stop();');
        animation.stop();
    }, 2500);


    // console.log(parseNumber('-123.265em'));
    // console.log(parseNumber('+123.265em'));
    // console.log(parseNumber('123.265em'));
    // console.log(parseNumber('-.265em'));
    // console.log(parseNumber('.265em'));
    // console.log(parseNumber('.em'));
    // console.log(parseNumber('-.em'));
    // console.log(parseValue('-1.em'));
    // console.log(parseValue('.99vh'));
    // console.log(parseValue('-1.99 %'));
    // console.log(parseValue('-%'));
    // console.log(parseAll('border: 5px solid darkblue;'));
    // console.log(matchFormat(
    //     parseAll('border: 5px solid darkblue;'),
    //     parseAll('border: 50% solid darkblue;')
    // ));
    // console.log(matchFormat(
    //     parseAll('border: 5px solid darkblue;'),
    //     parseAll('border: 50% solid red;')
    // ));

}, 100);