import { PrismaClient } from '@prisma/client'
import localities from '../data/german-postal-codes.json';


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

async function main() {
    let states: State[] = [];
    let districts: District[] = [];

    // Clean database from old executions (TODO reset id increment)
    await prisma.state.deleteMany()
    await prisma.district.deleteMany()

    // Loop through german-postal-codes.json and convert the state and community attributes to objects and store them in an array
    for (let i = 1; i <= Object.keys(localities).length; i++) {
        if ((states.filter(filterState => filterState.name == localities[i].state)).length == 0) {
            states.push({name: localities[i].state})
        }
        if ((districts.filter(filterDistrict => filterDistrict.name == localities[i].community)).length == 0) {
            districts.push({name: localities[i].community, state: {name: localities[i].state}})
        }
    }

    // console.log(states)
    // console.log(districts)


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
    console.dir(allStates, { depth: null })
}

main()
    .catch((e) => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })