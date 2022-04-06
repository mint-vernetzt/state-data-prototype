import {evaluateJsonObject } from './index';

describe('test the index.js', () => {
    test('test evaluateJsonObject()', async () => {
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
        await expect(evaluateJsonObject(testJson, 'state', 'name')).toStrictEqual({states: stateResults, districts: districtResults});
    });

    test('test evaluateJsonObject() with bigger object', async () => {
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
        await expect(evaluateJsonObject(testJson, 'state', 'name')).toStrictEqual({states: stateResults, districts: districtResults});
    });

    test('test evaluateJsonObject() with duplicates', async () => {
        const testJson = {
            '01234': {
                ags: '01234',
                name: 'A',
                county: 'LK A',
                state: 'BL1',
                uselessAttribute1: 'uselessValue',
                uselessAttribute2: 'uselessValue'
            },
            '01235': {
                ags: '01235',
                name: 'A',
                county: 'SK A',
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
                name: 'B', // this might be a LK
                county: 'LK B',
                state: 'BL2',
                uselessAttribute1: 'uselessValue',
                uselessAttribute2: 'uselessValue'
            },
            '02452': {
                ags: '02452',
                name: 'B', // and this an SK -> same name but different ags
                county: 'SK B',
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
                name: 'A',
                stateAgsPrefix: '01',
            },
            {
                ags: '02345',
                name: 'LK2',
                stateAgsPrefix: '02',
            },
            {
                ags: '02456',
                name: 'B',
                stateAgsPrefix: '02',
            },
            {
                ags: '01567',
                name: 'LK4',
                stateAgsPrefix: '01',
            }
        ]
        await expect(evaluateJsonObject(testJson, 'state', 'name')).toStrictEqual({states: stateResults, districts: districtResults});
    });
})

