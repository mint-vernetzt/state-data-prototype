const https = require('https');
import prisma from "./client";

// Interfaces
export interface State {
    name: string,
    agsPrefix: string
}

export interface District {
    name: string,
    ags: string,
    stateAgsPrefix?: string
}

// The main function, which is called by the cli (load-german-states-and-districts.ts)
export async function main(apiUrl?:string, filePath?:string, stateKey='state', districtKey='county', consoleOutput: boolean = false) {
    if (apiUrl) {
        // Makes a http request to the corona API and passes on the response body to evaluateJsonObject()
        await https.get(apiUrl, async res=> {
            let data = [];

            res.on('data', chunk => {
                data.push(chunk);
            });

            res.on('end', async () => {
                const corona = JSON.parse(Buffer.concat(data).toString());

                await writeToDatabase(evaluateJsonObject(corona.data, stateKey, districtKey))
                return await logResults(consoleOutput);
            });
        }).on('error', err => {
            console.log('Error: ', err.message);
        });
    } else {
        // Imports the districts from the specified file and passes them on to evaluateJsonObject()
        const localities = await import(filePath).then(module => module.default);

        await writeToDatabase(evaluateJsonObject(localities.data, stateKey, districtKey))
        return await logResults(consoleOutput);
    }
}

// Loop through a json object and convert the attributes to objects and store them in an array
// Expected structure:
/*
{
    ags: {
        stateKey: string,
        districtKey: string,
        ...
    },
    ...
}
*/
export function evaluateJsonObject(jsonObject: Object, stateKey: string, districtKey: string): {districts: District[], states: State[]} {
    let states: State[] = [];
    let districts: District[] = [];

    for (const [key, value] of Object.entries(jsonObject)) {
        if ((states.filter(filterState => filterState.agsPrefix == key.slice(0, 2))).length == 0) {
            states.push({ name: value[stateKey], agsPrefix: key.slice(0, 2) })
        }
        if ((districts.filter(filterDistrict => filterDistrict.ags == key || (filterDistrict.name == value[districtKey] && filterDistrict.stateAgsPrefix == key.slice(0, 2)))).length == 0) {
            districts.push({name: value[districtKey], ags: key, stateAgsPrefix: key.slice(0, 2)  })
        }
    }

    return {states: states, districts: districts}
}

// Clear the database and write the states and districts to it, also relate them
export async function writeToDatabase(data: {states: any[], districts: any[]}) {
    await prisma.district.deleteMany()
    await prisma.state.deleteMany()

    console.dir(data.districts, {depth: null})

    // Write all the states to the database
    await prisma.state.createMany({
        data: data.states
    })
    await prisma.district.createMany({
        data: data.districts
    })
}

export async function logResults(consoleOutput: boolean) {
    // Get all states together with their districts and log them
    const allStates = await prisma.state.findMany({
        include: {
            districts: true,
        }
    })
    if (consoleOutput) {
        console.dir(allStates, {depth: null})
    } else {
        return allStates
    }
}
