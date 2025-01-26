import { Command, InvalidArgumentError } from 'commander';
import { resolve, extname, join } from 'node:path';
import { promises as fs, statSync } from 'node:fs';
import ImageComparer from './compare.js';
import Logger from './logger.js';

const fileExists = file => {
    try {
        return !!(statSync(file));
    }
    catch (e) {
        return false;
    }
};

const parseFilePath = value => {
    if (!value) {
        throw new InvalidArgumentError('A path must be provided.');
    }
    const inputPath = resolve(value);
    if (!inputPath || inputPath === '/' || !fileExists(inputPath)) {
        throw new InvalidArgumentError('A valid path must be provided.');
    }
    return inputPath;
};

const parseNumber = value => {
    if (!value || value < 0 || isNaN(Number(value)) || parseInt(value) !== parseFloat(value)) {
        throw new InvalidArgumentError('A positive integer must be provided.');
    }
    return parseInt(value);
};

const parseExtensions = extValue => {
    return extValue.split(',')
        .map(ext => ext.trim())
        .map(ext => ext.toLowerCase())
        .map(ext => ext.indexOf('.') !== 0 ? '.' + ext : ext);
};

const isDirectory = async (path) => {
    const stat = await fs.lstat(path);
    return stat.isDirectory();
};

const detectFakes = async (inputFileOrDirectory, { examples, threshold, workingDirectory, exampleExtensions, videoExtensions, logLevel }) => {
    Logger.level = logLevel;

    const comparer = new ImageComparer(examples, threshold, workingDirectory, exampleExtensions);

    Logger.debug(`Using examples from "${examples}."`);
    if (await isDirectory(inputFileOrDirectory)) {
        Logger.debug(`Recursively scanning "${inputFileOrDirectory}" for files...`);
        const files = await fs.readdir(inputFileOrDirectory, { recursive: true });
        const filteredFiles = files.filter(file => videoExtensions.includes(extname(file).toLowerCase()))
            .map(file => join(inputFileOrDirectory, file));
        Logger.info(`Found ${filteredFiles.length} files to process (${files.length} before filtering).`);
        for (let file of filteredFiles) {
            await comparer.isFake(file);
        }
    } else {
        const isFake = await comparer.isFake(inputFileOrDirectory);
        if (isFake) {
            process.exit(-1);
        }
    }
};

const main = async () => {
    const program = new Command();
    program.name('fake-detector')
        .description('Detects fake video files using a series of examples')
        .version('1.0.0')
        .argument('<path>', 'path to input file or directory', parseFilePath)
        .option('-e, --examples <path>', 'path to examples', parseFilePath, '/app/examples')
        .option('-t, --threshold <value>', 'number of bits in hash which can be different', parseNumber, 5)
        .option('-w, --workingDirectory <path>', 'path to store temporary files', parseFilePath, '/tmp')
        .option('-i, --exampleExtensions <extensions>', 'accepted extensions for examples', parseExtensions, ['.png', '.jpg'])
        .option('-x, --videoExtensions <extensions>', 'accepted extensions for video files', parseExtensions, ['.avi', '.mp4', '.mkv', '.mov', '.vob'])
        .option('-l, --logLevel <level>', 'log level', 'info')
        .action(detectFakes)
        .configureOutput({
            writeOut: str => Logger.warn(str),
            writeErr: str => Logger.error(str)
        });

    await program.parse();
};

await main();
