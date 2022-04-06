const https = require('https');
import prisma from "./client";

// Interfaces
export interface State {
    name: string
}

export interface District {
    name: string,
    state: State
}

// The main function, which is called by the cli (load-german-states-and-districts.ts)
export async function main(apiUrl?:string, filePath?:string, stateKey='state', districtKey='community', consoleOutput: boolean = false) {
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
                return await logResults(consoleOutput);
            });
        }).on('error', err => {
            console.log('Error: ', err.message);
        });
    } else {
        const localities = await import(filePath).then(module => module.default);

        const returnValue: any[] = evaluateJsonObject(localities, stateKey, districtKey)
        const states: State[] = returnValue[0]
        const districts: District[] = returnValue[1]

        await writeToDatabase(states, districts)
        return await logResults(consoleOutput);
    }
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
export async function writeToDatabase(states: State[], districts: District[]) {
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
