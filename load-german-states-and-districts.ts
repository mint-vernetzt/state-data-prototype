import { program } from 'commander'
import { main } from './src'
import prisma from "./src/client";

program
    .name('german-states-and-districts-dataset-generator')
    .description('CLI tool to populate the migrated states and district tables with data.')
    .version('0.5.0')
    .option('-u, --url <char>', 'the url of an API with the districts and their states (e.g. https://api.corona-zahlen.org/districts)', null)
    .option('-f, --file <char>', 'the path to the file with the districts and their states', 'data/german-postal-codes.json')
    .option('-s, --stateKey <char>', 'the key of the objects that holds the state name', 'state')
    .option('-d, --districtKey <char>', 'the key of the objects that holds the district name', 'community')
    .option('--output', 'whether to log the resulting database');


program.parse();

const options = program.opts();

if (options.url) {
    main(options.url, '', options.stateKey, options.districtKey, options.output).catch((e) => {throw e}).finally(async () => {await prisma.$disconnect()})
} else {
    main(null, '../' + options.file, options.stateKey, options.districtKey, options.output).catch((e) => {throw e}).finally(async () => {await prisma.$disconnect()})
}

