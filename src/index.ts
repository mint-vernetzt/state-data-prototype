import { PrismaClient } from '@prisma/client'
import localities from '../data/german-postal-codes.json';
const https = require('https');

// Interfaces
export interface State {
    name: string
}

export interface District {
    name: string,
    state: State
}

// Load prisma
const prisma = new PrismaClient()
export default prisma

export async function main(apiUrl, stateKey='state', districtKey='name') {
    if (apiUrl) {
        // Makes a http request to the corona API and returns the response body
        await https.get(apiUrl, async res=> {
            let data = [];

            res.on('data', chunk => {
                data.push(chunk);
            });

            res.on('end', async () => {
                const corona = JSON.parse(Buffer.concat(data).toString());

                const returnValue: any[] = evaluateJsonObject(corona.data, stateKey, districtKey)
                const states: State[] = returnValue[0]
                const districts: District[] = returnValue[1]

                await writeToDatabase(states, districts)

            });
        }).on('error', err => {
            console.log('Error: ', err.message);
        });
    } else {
        const returnValue: any[] = evaluateJsonObject(localities, stateKey, districtKey)
        const states: State[] = returnValue[0]
        const districts: District[] = returnValue[1]

        await writeToDatabase(states, districts)
    }
    await logResults();
}

// Loop through a json object and convert the attributes to objects and store them in an array
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
export function evaluateJsonObject(jsonObject: Object, stateKey: string, districtKey: string) {
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

// Clear the database and write the states and districts to it, also relate them
async function writeToDatabase(states: State[], districts: District[]) {
    // Clean database from old executions
    await prisma.district.deleteMany()
    await prisma.state.deleteMany()

    // Write all the states to the database
    for (const state of states) {
        // Create a list with all the districts of the current state
        let createDistricts = districts.filter(filterDistrict => filterDistrict.state.name == state.name)
        // Filter out the districts from createDistricts from the districts array
        districts = districts.filter(filterDistrict => filterDistrict.state.name != state.name)
        // Delete the state property in the createDistricts, so that Prisma can create them
        createDistricts.forEach(loopDistrict => delete loopDistrict.state)
        await prisma.state.create({
            data: {
                name: state.name,
                districts: {
                    create: createDistricts
                }
            },
        })
    }
}

export async function logResults() {
    // Get all states together with their districts and log them
    const allStates = await prisma.state.findMany({
        include: {
            districts: true,
        }
    })
    console.dir(allStates, {depth: null})
}

/*
main('https://api.corona-zahlen.org/districts', 'state', 'county')
    .catch((e) => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })*/
