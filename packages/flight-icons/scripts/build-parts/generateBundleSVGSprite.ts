import fs from 'fs-extra';

// @ts-ignore svgstore doesn't have type definitions available
import svgstore from 'svgstore';

import { ConfigData } from '../@types/ConfigData';
import { AssetsCatalog } from '../@types/AssetsCatalog';

export async function generateBundleSVGSprite({ config, catalog } : { config: ConfigData, catalog: AssetsCatalog }): Promise<void> {

    const tempSVGFolderPath = config.tempFolder;

    // remove the generated content from the destination folder
    try {
        await fs.emptyDir(`${config.mainFolder}/svg-sprite`)
    } catch (err) {
        console.error(err);
    }

    // generate the sprite via "svgstore"
    const sprites = svgstore({
        // see https://github.com/svgstore/svgstore#options for details
        renameDefs: false, // we already create unique IDs (using the icon name) in the SVGO step
        svgAttrs: { width: '0', height: '0', class: 'flight-sprite-container', 'aria-hidden': 'true'  },
    });

    // add the SVGs to the sprite
    for(const { fileName } of catalog.assets) {
        let svgSource = await fs.readFile(`${tempSVGFolderPath}/${fileName}.svg`, 'utf8');
        // completely remove any "fill" attribute that has #000001 ("dynamic" color in Figma, equivalent of "currentColor") as value
        // the reason for this is that the Ember addon uses the "fill" attribute with "currentColor" value (or a value passed as prop by the user)
        // to set the color of the children <path> elements (see https://github.com/hashicorp/flight/issues/200) so the only way to have it work properly
        // is not to use `fill="currentColor"` on the <path> elements, but to completely remove the fill attribute so it's inherited from the parent <SVG> element
        svgSource = svgSource.replace(/ fill="#000001"/gi, '');
        // add the processed SVG content to the sprite (notice: the first argument is the symbol ID)
        sprites.add(`flight-${fileName}`, svgSource);
    }

    // transform the "sprite" into a string
    // see https://github.com/svgstore/svgstore#tostringoptions-string
    const svgSpriteContent = sprites.toString({ inline: true });

    let svgModuleContent = '// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.\n'
    svgModuleContent += `module.exports = '${svgSpriteContent}';\n`

    // update the SVG "module"
    await fs.writeFile(`${config.mainFolder}/svg-sprite/svg-sprite-module.js`, svgModuleContent);
}
