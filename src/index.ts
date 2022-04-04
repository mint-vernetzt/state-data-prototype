import { PrismaClient } from '@prisma/client'
import localities from '../data/german-postal-codes.json';

interface State {
    name: string
}

interface District {
    name: string,
    state: State
}

const prisma = new PrismaClient()

async function main() {
    let states: State[] = [];
    let districts: District[] = [];

    await prisma.state.deleteMany()
    await prisma.district.deleteMany()

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

    for (const state of states) {
        await prisma.state.create({
            data: {
                name: state.name,
            },
        })
    }

    for (const district of districts) {
        const state = await prisma.state.findFirst({
            where: {
                name: district.state.name,
            },
        })
        await prisma.district.create({
            data: {
                name: district.name,
                stateId: state.id
            },
        })
    }

    const allStates = await prisma.state.findMany()
    console.dir(allStates, { depth: null })
}

main()
    .catch((e) => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })