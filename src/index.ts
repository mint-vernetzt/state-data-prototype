import { PrismaClient } from '@prisma/client'
import localities from '../data/german-postal-codes.json';
const https = require('https');

const api: boolean = true

// Interfaces
interface State {
    name: string
}

interface District {
    name: string,
    state: State
}

// Load prisma
const prisma = new PrismaClient()

// Loop through an jsonObject and convert the attributes to objects and store them in an array
// Expected structure:
/*
{
    "1": {
        stateKey: string,
        districtKey: string,
        ...
    }
}
*/
function evaluateJsonObject(jsonObject: Object, stateKey: string = "state", districtKey: string = "name") {
    let states: State[] = [];
    let districts: District[] = [];

    for (const [, value] of Object.entries(jsonObject)) {
        if ((states.filter(filterState => filterState.name == value[stateKey])).length == 0) {
            states.push({ name: value[stateKey] })
        }
        if ((districts.filter(filterDistrict => filterDistrict.name == value[districtKey])).length == 0) {
            districts.push({name: value[districtKey], state: { name: value[stateKey] }})
        }
    }

    return [states, districts]
}

async function main() {
    if (api) {
        // Makes a http request to the corona API and returns the response body
        https.get('https://api.corona-zahlen.org/districts', async res => {
            let data = [];

            res.on('data', chunk => {
                data.push(chunk);
            });

            res.on('end', async () => {
                const corona = JSON.parse(Buffer.concat(data).toString());

                const returnValue: any[] = evaluateJsonObject(corona.data, "state", "county")
                const states: State[] = returnValue[0]
                const districts: District[] = returnValue[1]

                console.log(states)
                console.log(districts)

                // Clean database from old executions (TODO reset id increment)
                await prisma.district.deleteMany()
                await prisma.state.deleteMany()

                // Write all the states to the database
                for (const state of states) {
                    await prisma.state.create({
                        data: {
                            name: state.name,
                        },
                    })
                }

                // Write all the districts to the database
                for (const district of districts) {
                    // Find the state of the district
                    const state = await prisma.state.findFirst({
                        where: {
                            name: district.state.name,
                        },
                    })
                    await prisma.district.create({
                        data: {
                            name: district.name,
                            stateId: state.id // Use the found state for the relationship
                        },
                    })
                }

                // Get all states together with their districts and log them
                const allStates = await prisma.state.findMany({
                    include: {
                        districts: true,
                    }
                })
                console.dir(allStates, {depth: null})
            });
        }).on('error', err => {
            console.log('Error: ', err.message);
        });
    } else {
        const returnValue: any[] = evaluateJsonObject(localities, "state", "community")
        const states: State[] = returnValue[0]
        const districts: District[] = returnValue[1]

        console.log(states)
        console.log(districts)

        // Clean database from old executions (TODO reset id increment)
        await prisma.district.deleteMany()
        await prisma.state.deleteMany()

        // Write all the states to the database
        for (const state of states) {
            await prisma.state.create({
                data: {
                    name: state.name,
                },
            })
        }

        // Write all the districts to the database
        for (const district of districts) {
            // Find the state of the district
            const state = await prisma.state.findFirst({
                where: {
                    name: district.state.name,
                },
            })
            await prisma.district.create({
                data: {
                    name: district.name,
                    stateId: state.id // Use the found state for the relationship
                },
            })
        }

        // Get all states together with their districts and log them
        const allStates = await prisma.state.findMany({
            include: {
                districts: true,
            }
        })
        console.dir(allStates, {depth: null})
    }
}

main()
    .catch((e) => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })