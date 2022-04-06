import {evaluateJsonObject, State, District, logResults, main, writeToDatabase} from './index';

// TODO mock database is not being used
// TODO mock database needs to be reset after every test

describe('test the index.js', () => {
    test('test evaluateJsonObject()', async () => {
        const testJson = {
            "2": {
                "name": "LK1",
                "state": "BL1",
                "uselessAttribute": "uselessValue"
            }
        }
        const stateResults: State[] = [
            {
                "name": "BL1"
            }
        ]
        const districtResults: District[] = [
            {
                "name": "LK1",
                "state": {
                    "name": "BL1"
                }
            }
        ]
        await expect(evaluateJsonObject(testJson, 'state', 'name')).toStrictEqual([stateResults, districtResults]);
    });

    test('test evaluateJsonObject() and logResults() with bigger object', async () => {
        const testJson = {
            "2": {
                "name": "LK1",
                "state": "BL1",
                "uselessAttribute1": "uselessValue",
                "uselessAttribute2": "uselessValue"
            },
            "3": {
                "name": "LK2",
                "state": "BL2",
            },
            "10000": {
                "name": "LK3",
                "state": "BL2",
                "uselessAttribute1": "uselessValue",
                "uselessAttribute2": "uselessValue"
            },
            "a": {
                "name": "LK1",
                "state": "BL1",
            }
        }
        const stateResults: State[] = [
            {
                "name": "BL1"
            },
            {
                "name": "BL2"
            }
        ]
        const districtResults: District[] = [
            {
                "name": "LK1",
                "state": {
                    "name": "BL1"
                }
            },
            {
                "name": "LK2",
                "state": {
                    "name": "BL2"
                }
            },
            {
                "name": "LK3",
                "state": {
                    "name": "BL2"
                }
            }
        ]
        await expect(evaluateJsonObject(testJson, 'state', 'name')).toStrictEqual([stateResults, districtResults]);
    });

    test('test writeToDatabase()', async () => {
        const testStates = [
            {
                name: 'BL1',
            },
            {
                name: 'BL2',
            },
            {
                name: 'BL3',
            }
        ]
        const testDistricts = [
            {
                name: 'LK1',
                state: { name: 'BL1' }
            },
            {
                name: 'LK2',
                state: { name: 'BL1' }
            },
            {
                name: 'LK3',
                state: { name: 'BL2' }
            },
            {
                name: 'SK1',
                state: { name: 'BL2' }
            }

        ]
        await writeToDatabase(testStates, testDistricts)

        await expect(logResults(false)).resolves.toEqual([
            {
                id: 1,
                name: 'BL1',
                districts: [
                    {
                        id: 1,
                        name: 'LK1',
                        stateId: 1
                    },
                    {
                        id: 2,
                        name: 'LK2',
                        stateId: 1
                    }
                ]
            },
            {
                id: 2,
                name: 'BL2',
                districts: [
                    {
                        id: 3,
                        name: 'LK3',
                        stateId: 2
                    },
                    {
                        id: 4,
                        name: 'SK1',
                        stateId: 2
                    }
                ]
            },
            {
                id: 3,
                name: 'BL3',
                districts: []
            }
        ])
    })

    test('test main() with ../data/test.json', async () => {
        await expect(main('', '../data/test.json', 'state', 'community', false)).resolves.toBe([
            {
                id: 1,
                name: 'BL1',
                districts: [
                    {
                        id: 1,
                        name: 'LK1',
                        stateId: 1
                    },
                    {
                        id: 2,
                        name: 'LK2',
                        stateId: 1
                    },
                ]
            }
        ])
    });

    test('test main() with ../data/test2.json', async () => {
        // TODO find out why order in actual database is different -> does jest provide a funtion wich checks if the objects are the same but allows the order to differ
        await expect(main('', '../data/test2.json', 'state', 'name', false)).resolves.toBe([
            {
                id: 1,
                name: 'BL1',
                districts: [
                    {
                        id: 1,
                        name: 'LK1',
                        stateId: 1
                    },
                    {
                        id: 2,
                        name: 'LK2',
                        stateId: 1
                    },
                ]
            },
            {
                id: 2,
                name: 'BL3',
                districts: [
                    {
                        id: 3,
                        name: 'LK3',
                        stateId: 2
                    },
                ]
            },
            {
                id: 4,
                name: 'BL4',
                districts: [
                    {
                        id: 4,
                        name: 'LK4',
                        stateId: 4
                    },
                ]
            },
        ])
    });
})

