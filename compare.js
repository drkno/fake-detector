import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { extname, join } from 'node:path';
import { imageHash } from 'image-hash';
import ffmpeg from 'fluent-ffmpeg';
import Logger from './logger.js';

class ImageComparer {
    constructor(examples, threshold, workingDirectory, examplesExtensions) {
        this._initialised = false;
        this._examples = {};
        this._exampleDirectory = examples;
        this._threshold = threshold;
        this._workingDirectory = workingDirectory;
        this._examplesExtensions = examplesExtensions;
    }

    async _initialiseExamples() {
        Logger.debug('Initialising example hashes...');

        const imageFiles = (await fs.readdir(this._exampleDirectory))
            .filter(file => this._examplesExtensions.includes(extname(file).toLowerCase()))
            .map(file => join(this._exampleDirectory, file));

        const imageHashes = await Promise.all(imageFiles.map(this._calculateImageHash));

        for (let index in imageFiles) {
            this._examples[imageHashes[index]] = imageFiles[index];
        }

        this._initialised = true;

        Logger.debug('Example hash initialisation complete.');
    }

    _calculateImageHash(imagePath) {
        return new Promise((resolve, reject) => {
            imageHash(imagePath, 16, true, (err, hash) => {
                if (err) return reject(err);
                resolve(hash);
            });
        });
    }

    _compareHashes(firstHash, secondHash) {
        let diff = 0;
        for (let i in firstHash) {
            diff += (firstHash[i] !== secondHash[i]) ? 1 : 0;
        }
        return diff < this._threshold;
    }

    _checkImageForMatch(imageHash) {
        return Object.keys(this._examples)
            .filter(example => this._compareHashes(imageHash, example))
            .map(example => this._examples[example]);
    }

    async _checkImagesForMatch(images) {
        const imageHashes = await Promise.all(images.map(this._calculateImageHash));
        return [...new Set(imageHashes.flatMap(image => this._checkImageForMatch(image)))];
    }

    _extractScreenshots(videoPath, screenshotTimes, filePrefix) {
        const promises = screenshotTimes.map((time, index) => {
            return new Promise((resolve, reject) => {
                const outputFile = join(this._workingDirectory, `${filePrefix}_${index}.png`);
                ffmpeg(videoPath)
                    .seekInput(time)
                    .output(outputFile)
                    .outputOptions('-vframes 1')
                    .on('end', () => resolve(outputFile))
                    .on('error', reject)
                    .run();
            });
        });
        return Promise.all(promises);
    }

    _deleteScreenshots(files) {
        return Promise.all(files.map(fs.unlink));
    }

    _computeVideoDuration(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) return reject(err);
                resolve(metadata.format.duration);
            });
        });
    }

    async isFake(videoPath) {
        if (!this._initialised) {
            await this._initialiseExamples();
        }

        Logger.info(`Checking ${videoPath}...`);
        const videoDuration = await this._computeVideoDuration(videoPath);
        const screenshotTimes = [videoDuration / 4, videoDuration / 2, (3 * videoDuration) / 4];
    
        const screenshotPrefix = createHash('md5').update(videoPath).digest('hex');
        const screenshots = await this._extractScreenshots(videoPath, screenshotTimes, screenshotPrefix);
    
        const matches = await this._checkImagesForMatch(screenshots);
        await this._deleteScreenshots(screenshots);
    
        if (matches.length > 0) {
            Logger.error(`Fake found.\n\tFile: ${videoPath}\n\tMatch: ${matches.join(', ')}`);
            return true;
        }
        Logger.debug(`Video is not a fake.`);
        return false;
    }
}

export default ImageComparer;
