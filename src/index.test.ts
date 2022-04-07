import {evaluateJsonObject } from './index';

describe('test evaluateJsonObject() from index.js', () => {
    test('test basic functionality', () => {
        const testJson = {
            '01234': {
                'name': 'LK1',
                'state': 'BL1',
                'uselessAttribute': 'uselessValue'
            }
        }
        const stateResults = [
            {
                agsPrefix: "01",
                name: "BL1"
            }
        ]
        const districtResults = [
            {
                ags: '01234',
                name: "LK1",
                stateAgsPrefix: '01'
            }
        ]
        expect(evaluateJsonObject(testJson, 'state', 'name')).toStrictEqual({states: stateResults, districts: districtResults});
    });

    test('test basic functionality with bigger object', () => {
        const testJson = {
            '01234': {
                ags: '01234',
                name: 'LK1',
                state: 'BL1',
                uselessAttribute1: 'uselessValue',
                uselessAttribute2: 'uselessValue'
            },
            '02345': {
                ags: '02345',
                name: 'LK2',
                state: 'BL2',
            },
            '02456': {
                ags: '02456',
                name: 'LK3',
                state: 'BL2',
                uselessAttribute1: 'uselessValue',
                uselessAttribute2: 'uselessValue'
            },
            '01567': {
                ags: '01567',
                name: 'LK4',
                state: 'BL1',
            }
        }
        const stateResults = [
            {
                agsPrefix: '01',
                name: 'BL1'
            },
            {
                agsPrefix: '02',
                name: 'BL2'
            }
        ]
        const districtResults = [
            {
                ags: '01234',
                name: 'LK1',
                stateAgsPrefix: '01',
            },
            {
                ags: '02345',
                name: 'LK2',
                stateAgsPrefix: '02',
            },
            {
                ags: '02456',
                name: 'LK3',
                stateAgsPrefix: '02',
            },
            {
                ags: '01567',
                name: 'LK4',
                stateAgsPrefix: '01',
            }
        ]
        expect(evaluateJsonObject(testJson, 'state', 'name')).toStrictEqual({states: stateResults, districts: districtResults});
    });

    test('test with invalid ags (ags too short)', () => {
        const testJson = {
            '0123': {
                'name': 'LK1',
                'state': 'BL1',
                'uselessAttribute': 'uselessValue',
                'community': 'LK1'
            },
        }
        expect(() => {evaluateJsonObject(testJson, 'state', 'name')}).toThrowError(new Error('Invalid ags: 0123'));
    });

    test('test with invalid ags (ags too long)', () => {
        const testJson = {
            '0123456789': {
                'name': 'LK1',
                'state': 'BL1',
                'uselessAttribute': 'uselessValue',
                'community': 'LK1'
            },
        }
        expect(() => {evaluateJsonObject(testJson, 'state', 'name')}).toThrowError(new Error('Invalid ags: 0123456789'));
    });

    test('test with invalid ags (ags from letters)', () => {
        const testJson = {
            'aaaaa': {
                'name': 'LK1',
                'state': 'BL1',
                'uselessAttribute': 'uselessValue',
                'community': 'LK1'
            },
        }
        expect(() => {evaluateJsonObject(testJson, 'state', 'name')}).toThrowError(new Error('Invalid ags: aaaaa'));
    });

    test('test with invalid ags (ags from letters and numbers)', () => {
        const testJson = {
            '111aa': {
                'name': 'LK1',
                'state': 'BL1',
                'uselessAttribute': 'uselessValue',
                'community': 'LK1'
            },
        }
        expect(() => {evaluateJsonObject(testJson, 'state', 'name')}).toThrowError(new Error('Invalid ags: 111aa'));
    });

    test('test with invalid stateKey', () => {
        const testJson = {
            '01234': {
                'name': 'LK1',
                'state': 'BL1',
                'uselessAttribute': 'uselessValue',
                'community': 'LK1'
            },
            '02235': {
                'name': 'LK2',
                // missing state value
                'bundesland': 'BL2',
                'uselessAttribute': 'uselessValue'
            }
        }
        expect(() => {evaluateJsonObject(testJson, 'state', 'name')}).toThrowError(new Error('Invalid stateKey: state'));
    });

    test('test with invalid districtKey', () => {
        const testJson = {
            '01234': {
                'name': 'LK1',
                'state': 'BL1',
                'uselessAttribute': 'uselessValue',
                'community': 'LK1'
            },
            '01235': {
                'name': 'LK2',
                'state': 'BL1',
                'uselessAttribute': 'uselessValue',
                // missing community value
            }
        }
        expect(() => {evaluateJsonObject(testJson, 'state', 'community')}).toThrowError(new Error('Invalid districtKey: community'));
    });

    test('test with two states that have the same name but different ags prefix', () => {
        const testJson = {
            '01234': {
                'state': 'BL1',
                'community': 'LK1'
            },
            '02235': {
                'state': 'BL1',
                'community': 'LK2',
            }
        }
        expect(() => {evaluateJsonObject(testJson, 'state', 'community')}).toThrowError(new Error('There are states with the same name but different ags prefixes: BL1 (01) and BL1 (02)'));
    });

    test('test with two districts that have the same name but different ags', () => {
        const testJson = {
            '01234': { // This is actually an SK
                'state': 'BL1',
                'name': 'A',
                'county': 'SKA'
            },
            '01235': { // This is actually a LK
                'state': 'BL1',
                'name': 'A',
                'county': 'LKA',
            }
        }
        expect(() => {evaluateJsonObject(testJson, 'state', 'name')}).toThrowError(new Error('There are districts with the same name but different ags: A (01234) and A (01235), maybe use a different districtKey?'));
    });
})

