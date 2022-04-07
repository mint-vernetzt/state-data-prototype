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

                await writeToDatabase(evaluateJsonObject(corona.data, stateKey, districtKey), consoleOutput)
                return await logStates(consoleOutput);
            });
        }).on('error', err => {
            console.log('Error: ', err.message);
        });
    } else {
        // Imports the districts from the specified file and passes them on to evaluateJsonObject()
        const localities = await import(filePath).then(module => module.default);

        await writeToDatabase(evaluateJsonObject(localities.data, stateKey, districtKey), consoleOutput)
        return await logStates(consoleOutput);
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
        if (key.length != 5 || isNaN(Number(key))) {
            throw new Error('Invalid ags: ' + key);
        }
        if ((states.filter(filterState => filterState.agsPrefix == key.slice(0, 2))).length == 0) {
            if (!value[stateKey]) {
                throw new Error('Invalid stateKey: ' + stateKey);
            }
            states.push({ name: value[stateKey], agsPrefix: key.slice(0, 2) })
        }
        if ((districts.filter(filterDistrict => filterDistrict.ags == key)).length == 0) {
            if (!value[districtKey]) {
                throw new Error('Invalid districtKey: ' + districtKey);
            }
            districts.push({name: value[districtKey], ags: key, stateAgsPrefix: key.slice(0, 2)  })
        }
    }

    // Check if there are states with the same name but different ags prefixes
    for (let i = 0; i < states.length; i++) {
        for (let j = 0; j < states.length; j++) {
            if (i != j && states[i].name == states[j].name) {
                throw new Error('There are states with the same name but different ags prefixes: ' + states[i].name + ' (' + states[i].agsPrefix + ') and ' + states[j].name + ' (' + states[j].agsPrefix + ')');
            }
        }
    }

    // Check if there are districts with the same name but different ags
    for (let i = 0; i < districts.length; i++) {
        for (let j = 0; j < districts.length; j++) {
            if (i != j && districts[i].name == districts[j].name) {
                throw new Error('There are districts with the same name but different ags: ' + districts[i].name + ' (' + districts[i].ags + ') and ' + districts[j].name + ' (' + districts[j].ags + '), maybe use a different districtKey?');
            }
        }
    }

    return {states: states, districts: districts}
}

// Intelligently write the states and districts to the database
// TODO needs to be tested but that requires a database mock
export async function writeToDatabase(data: {states: any[], districts: any[]}, consoleOutput = false) {
    const currentDistricts = await prisma.district.findMany()
    const currentStates = await prisma.state.findMany()

    // Sort the new states and districts into the categories create, update and delete
    const createDistricts = data.districts.filter(district => currentDistricts.filter(filterDistrict => filterDistrict.ags == district.ags).length == 0)
    const createStates = data.states.filter(state => currentStates.filter(filterState => filterState.agsPrefix == state.agsPrefix).length == 0)
    const updateStates = data.states.filter(state => currentStates.filter(filterState => filterState.agsPrefix == state.agsPrefix).length > 0)
    const updateDistricts = data.districts.filter(district => currentDistricts.filter(filterDistrict => filterDistrict.ags == district.ags).length > 0)
    const deleteDistricts = currentDistricts.filter(district => data.districts.filter(filterDistrict => filterDistrict.ags == district.ags).length == 0)
    const deleteStates = currentStates.filter(state => data.states.filter(filterState => filterState.agsPrefix == state.agsPrefix).length == 0)

    // Delete the states and districts that are not in the new data
    await prisma.district.deleteMany({
        where: {
            ags: {
                in: deleteDistricts.map(district => district.ags)
            }
        }
    })
    await prisma.state.deleteMany({
        where: {
            agsPrefix: {
                in: deleteStates.map(state => state.agsPrefix)
            }
        }
    })
    consoleOutput && console.log('Deleted ' + deleteDistricts.length + ' districts and ' + deleteStates.length + ' states')
    // Update the states and districts that are in the new data
    for (const state of updateStates) {
        await prisma.state.update({
            where: {
                agsPrefix: state.agsPrefix
            },
            data: {
                name: state.name
            }
        })
    }
    for (const district of updateDistricts) {
        await prisma.district.update({
            where: {
                ags: district.ags
            },
            data: {
                name: district.name,
                stateAgsPrefix: district.stateAgsPrefix
            }
        })
    }
    consoleOutput && console.log('Updated ' + updateStates.length + ' states and ' + updateDistricts.length + ' districts')
    // Write all new states and districts to the database
    await prisma.state.createMany({
        data: createStates
    })
    await prisma.district.createMany({
        data: createDistricts
    })
    consoleOutput && console.log('Created ' + createStates.length + ' states and ' + createDistricts.length + ' districts')
}

export async function logStates(consoleOutput: boolean) {
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
