(function () {
    let assert = (condition, message) => {
        if (!condition) throw Error(message);
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
        return [index, sign * num];
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
        return [index, [num, unit]];
    };

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
            } else {
                index++;
                char = string[index];
            }
        }
        if (startIndex < index) values.push(string.slice(startIndex, index));
        return values;
    };

    let matchFormat = (a, b) => {
        if (a.length != b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (typeof a[i] == 'string' && a[i] != b[i]) return false;
        }
        return true;
    };

    let interp = (ys, x, xs) => { };

    let mix = (y0, y1, x, x0 = 0, x1 = 1) => {
        // y0 -> f(x=0); y1 -> f(x=1); return y -> f(x)
        assert(x0 < x1, 'expect x0 < x1');
        x = (x - x0) / (x1 - x0);
        return y0 * (1 - x) + y1 * x;
    };

    const PX = 1;
    const CM = 96 / 2.54;
    const MM = CM / 10;
    const Q = CM / 40;
    const IN = 96;
    const PC = IN / 6;
    const PT = IN / 72;

    const absUnits = {
        'cm': CM,
        'mm': MM,
        'Q': Q,
        'in': IN,
        'pc': PC,
        'pt': PT,
        'px': PX,
    };

    let convertAbs = ([num, unit], targetUnit) => num * absUnits[unit] / absUnits[targetUnit];


    console.log(convertAbs(parseValue('37.8px')[1], 'cm'));

    class Animation {
        // this does not depend on css keyframes
        #keyframes;
        constructor(keyframes) {
            let computedKeyframes = {};
            let steps = Object.keys(keyframes);
            console.log(steps);
            this.#keyframes = computedKeyframes;
        }
        play() {
            return this;
        }
    };
    let animate = () => { };

    // console.log(parseNumber('-123.265em'));
    // console.log(parseNumber('+123.265em'));
    // console.log(parseNumber('123.265em'));
    // console.log(parseNumber('-.265em'));
    // console.log(parseNumber('.265em'));
    // console.log(parseNumber('.em'));
    // console.log(parseNumber('-.em'));
    console.log(parseValue('-1.em'));
    console.log(parseValue('.99vh'));
    console.log(parseValue('-1.99 %'));
    console.log(parseValue('-%'));
    console.log(parseAll('border: 5px solid darkblue;'));
    console.log(matchFormat(
        parseAll('border: 5px solid darkblue;'),
        parseAll('border: 50% solid darkblue;')
    ));
    console.log(matchFormat(
        parseAll('border: 5px solid darkblue;'),
        parseAll('border: 50% solid red;')
    ));

    let element = document.getElementById('item');
    console.log(element);

    new Animation({
        0: { left: '0px' },
        0.5: { left: '50%' },
        1: { left: '100px' },
    }).play(element);
})();