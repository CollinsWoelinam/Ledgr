// Renders app icons from assets/brand/*.svg. Run after changing the logo: node scripts/render-icons.js
const { Resvg } = require('@resvg/resvg-js');
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const BRAND = join(__dirname, '..', 'assets', 'brand');
const ASSETS = join(__dirname, '..', 'assets');
const read = (name) => readFileSync(join(BRAND, name), 'utf8');
const out = (svg, size, file) => writeFileSync(join(ASSETS, file), new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng());

// Launchers (Samsung especially) crop adaptive icons tightly, so the foreground layers sit at 74% around the centre.
const shrink = (svg) => svg.replace(/(<svg[^>]*>)/, '$1<g transform="translate(512 512) scale(0.74) translate(-512 -522)">').replace('</svg>', '</g></svg>');

out(read('icon.svg'), 1024, 'icon.png');
out(shrink(read('mark.svg')), 1024, 'adaptive-icon.png');
out(shrink(read('monochrome.svg')), 1024, 'monochrome-icon.png');
out(read('mark.svg'), 512, 'splash-icon.png');
out(read('icon.svg'), 48, 'favicon.png');
console.log('icons rendered');
