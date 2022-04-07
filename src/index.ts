const https = require('https');
import prisma from "./client";
import type { State, District } from '@prisma/client'

// The main function, which is called by the cli (load-german-states-and-districts.ts)
export async function main(apiUrl?:string, filePath?:string, stateKey='state', districtKey='county', verbose: boolean = false) {
    if (apiUrl) {
        // Makes a http request to the corona API and passes on the response body to evaluateJsonObject()
        await https.get(apiUrl, async res=> {
            let data = [];

            res.on('data', chunk => {
                data.push(chunk);
            });

            res.on('end', async () => {
                const corona = JSON.parse(Buffer.concat(data).toString());

                await writeToDatabase(evaluateJsonObject(corona.data, stateKey, districtKey), verbose)
                return await logStates(verbose);
            });
        }).on('error', err => {
            console.log('Error: ', err.message);
        });
    } else {
        // Imports the districts from the specified file and passes them on to evaluateJsonObject()
        const localities = await import(filePath).then(module => module.default);

        await writeToDatabase(evaluateJsonObject(localities.data, stateKey, districtKey), verbose)
        return await logStates(verbose);
    }
}

// Loop through a json object and convert the attributes to objects and store them in an array
// Expected structure:
/*
{
    ags1: {
        stateKey: string,
        districtKey: string,
        ...
    },
    ags2: {
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


// Prepare the data for writeToDatabase() so that it can efficiently be written to with bulk insert, update, or delete
export function prepareQueries(current: {states: any[], districts: any[]}, data: {states: any[], districts: any[]}, verbose = false) {
    const currentDistricts = current.districts
    const currentStates = current.states

    // Sort the new states and districts into the categories create, update and delete
    const insertDistricts = data.districts.filter(district => currentDistricts.filter(filterDistrict => filterDistrict.ags == district.ags).length == 0)
    const insertStates = data.states.filter(state => currentStates.filter(filterState => filterState.agsPrefix == state.agsPrefix).length == 0)
    const updateStates = data.states.filter(state => currentStates.filter(filterState => filterState.agsPrefix == state.agsPrefix && filterState.name != state.name).length > 0)
    const updateDistricts = data.districts.filter(district => currentDistricts.filter(filterDistrict => filterDistrict.ags == district.ags  && (filterDistrict.name != district.name || filterDistrict.stateAgsPrefix != district.stateAgsPrefix)).length > 0)
    const deleteDistricts = currentDistricts.filter(district => data.districts.filter(filterDistrict => filterDistrict.ags == district.ags).length == 0)
    const deleteStates = currentStates.filter(state => data.states.filter(filterState => filterState.agsPrefix == state.agsPrefix).length == 0)

    return {
        insertDistricts: insertDistricts,
        insertStates: insertStates,
        updateStates: updateStates,
        updateDistricts: updateDistricts,
        deleteDistricts: deleteDistricts,
        deleteStates: deleteStates
    }
}

// Intelligently write the states and districts to the database
export async function writeToDatabase(data: {states: any[], districts: any[]}, verbose = false) {
    const currentDistricts = await prisma.district.findMany()
    const currentStates = await prisma.state.findMany()

    const queries = prepareQueries({states: currentStates, districts: currentDistricts}, data, verbose)

    // Delete the states and districts that are not in the new data
    await prisma.district.deleteMany({
        where: {
            ags: {
                in: queries.deleteDistricts.map(district => district.ags)
            }
        }
    })
    await prisma.state.deleteMany({
        where: {
            agsPrefix: {
                in: queries.deleteStates.map(state => state.agsPrefix)
            }
        }
    })
    verbose && console.log('Deleted ' + queries.deleteStates.length + ' states and ' + queries.deleteDistricts.length + ' districts')

    // Update the states and districts that are in the new data
    const stateUpdates = [];
    for (const state of queries.updateStates) {
        stateUpdates.push(prisma.state.update({
            where: {
                agsPrefix: state.agsPrefix
            },
            data: {
                name: state.name
            }
        }));
    }
    const districtUpdates = [];
    for (const district of queries.updateDistricts) {
        districtUpdates.push(prisma.district.update({
            where: {
                ags: district.ags
            },
            data: {
                name: district.name,
                stateAgsPrefix: district.stateAgsPrefix
            }
        }));
    }
    await prisma.$transaction([...stateUpdates, ...districtUpdates]);
    verbose && console.log('Updated ' + queries.updateStates.length + ' states and ' + queries.updateDistricts.length + ' districts')

    // Write all new states and districts to the database
    await prisma.state.createMany({
        data: queries.insertStates
    })
    await prisma.district.createMany({
        data: queries.insertDistricts
    })
    verbose && console.log('Created ' + queries.insertStates.length + ' states and ' + queries.insertDistricts.length + ' districts')
}

export async function logStates(verbose: boolean) {
    // Get all states together with their districts and log them
    const allStates = await prisma.state.findMany({
        include: {
            districts: true,
        }
    })
    if (verbose) {
        console.log('\nAll states with their districts:')
        console.dir(allStates, {depth: null})
    } else {
        return allStates
    }
}
