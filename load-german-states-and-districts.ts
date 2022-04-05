import { program } from 'commander'
import { main, prisma } from './src'

program
    .name('german-states-and-districts-dataset-generator')
    .description('CLI tool to populate the migrated states and district tables with data.')
    .version('0.5.0')
    .option('-u, --url <char>', 'the url of an API with the districts and their states (e.g. https://api.corona-zahlen.org/districts)', null)
    .option('-s, --stateKey <char>', 'the key of the objects that holds the state name', 'state')
    .option('-d, --districtKey <char>', 'the key of the objects that holds the district name', 'name');


program.parse();

const options = program.opts();

main(options.url, options.stateKey, options.districtKey).catch((e) => {throw e}).finally(async () => {await prisma.$disconnect()})

