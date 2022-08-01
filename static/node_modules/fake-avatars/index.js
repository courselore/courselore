import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

const originalsPath = process.argv[2];
const destinationPath = process.argv[3];

await fs.ensureDir(destinationPath);
const originals = await fs.readdir(originalsPath);
for (let index = 0; index < originals.length; index++)
  await sharp(path.join(originalsPath, originals[index]), {
    limitInputPixels: false,
  })
    .rotate()
    .resize({
      width: 256,
      height: 256,
      position: sharp.strategy.attention,
    })
    .toFile(path.join(destinationPath, `${index}.png`));
