import {evaluateJsonObject, State, District, logResults, main} from './index';
import { PrismaClient } from '@prisma/client'
import { prismaMock } from './singelton'
import {anyNumber} from "jest-mock-extended";

const prisma = new PrismaClient()
export default prisma

describe('test the index.js', () => {
    test('test evaluateJsonObject()', async () => {
        const testJson = {
            "2": {
                "name": "Landshut",
                "state": "Bayern",
            }
        }
        const stateResults: State[] = [
            {
                "name": "Bayern"
            }
        ]
        const districtResults: District[] = [
            {
                "name": "Landshut",
                "state": {
                    "name": "Bayern"
                }
            }
        ]
        await expect(evaluateJsonObject(testJson, 'state', 'name')).toStrictEqual([stateResults, districtResults]);
    });

    test('test evaluateJsonObject() with bigger object', async () => {
        const testJson = {
            "2": {
                "name": "LK1",
                "state": "BL1",
            },
            "3": {
                "name": "LK2",
                "state": "BL2",
            },
            "10000": {
                "name": "LK3",
                "state": "BL2",
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

    test('test main()', async () => {


        await expect(main(null, '../data/test.json', 'state', 'community', false)).resolves.toBe([
            {
                id: anyNumber,
                name: 'BL1',
                districts: [
                    {
                        id: anyNumber,
                        name: 'LK1',
                        stateId: anyNumber
                    },
                    {
                        id: anyNumber,
                        name: 'LK2',
                        stateId: anyNumber
                    },
                ]
            }
        ])
    });
})

