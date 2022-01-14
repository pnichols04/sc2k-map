/*  *****************************************************************

    TerrainZone.js

    Part of SC2K-style Terrain Renderer
    Demo: https://pnichols04.github.io/sc2k-map/
    Repo: https://github.com/pnichols04/sc2k-map

    Copyright © 2022 Philip Nichols

    Made available under the MIT License:

    Permission is hereby granted, free of charge, to any person 
    obtaining a copy of this software and associated documentation 
    files (the “Software”), to deal in the Software without 
    restriction, including without limitation the rights to use, 
    copy, modify, merge, publish, distribute, sublicense, and/or 
    sell copies of the Software, and to permit persons to whom the 
    Software is furnished to do so, subject to the following 
    conditions:

    The above copyright notice and this permission notice shall be 
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, 
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
    OTHER DEALINGS IN THE SOFTWARE.

    -----------------------------------------------------------------

    Attribution, as well as notice of any use, is requested but not 
    required.

**********************************************************************  */

/**
 * Describes a terrain zone
 * @typedef TerrainZoneInfo
 * @property {String} description A description of the zone
 * @property {number} moistureMin The minimum moisture level of the zone
 * @property {number} moistureMax The maximum moisture level of the zone
 * @property {number} elevation The elevation at which the zone occurs
 * @property {number} color The default color for displaying the zone
 */

export const TerrainZones = Object.freeze({
    /**
     * Snow
     * @type TerrainZoneInfo
     */
    SNOW: {
        description: "Snow",
        moistureMin: 3,
        moistureMax: 5,
        elevation: 3,
        color: 0xf8f8f8,
    },
    /**
     * Tundra
     * @type TerrainZoneInfo
     */
    TUNDRA: {
        description: "Tundra",
        moistureMin: 2,
        moistureMax: 2,
        elevation: 3,
        color: 0xddddbb,
    },
    /**
     * Bare
     * @type TerrainZoneInfo
     */
    BARE: {
        description: "Bare",
        moistureMin: 1,
        moistureMax: 1,
        elevation: 3,
        color: 0xbbbbbb,
    },
    /**
     * Scorched
     * @type TerrainZoneInfo
     */
    SCORCHED: {
        description: "Scorched",
        moistureMin: 0,
        moistureMax: 0,
        elevation: 3,
        color: 0x999999,
    },
    /**
     * Taiga
     * @type TerrainZoneInfo
     */
    TAIGA: {
        description: "Taiga",
        moistureMin: 4,
        moistureMax: 5,
        elevation: 2,
        color: 0xccd4bb,
    },
    /**
     * Shrubland
     * @type TerrainZoneInfo
     */
    SHRUBLAND: {
        description: "Shrubland",
        moistureMin: 2,
        moistureMax: 3,
        elevation: 2,
        color: 0xc4ccbb,
    },
    /**
     * Temperate desert
     * @type TerrainZoneInfo
     */
    DESERT_TEMPERATE: {
        description: "Temperate desert",
        moistureMin: 0,
        moistureMax: 1,
        elevation: 2,
        color: 0xe4e8ca,
    },
    /**
     * Temperate rainforest
     * @type TerrainZoneInfo
     */
    RAINFOREST_TEMPERATE: {
        description: "Temperate rainforest",
        moistureMin: 5,
        moistureMax: 5,
        elevation: 1,
        color: 0xa4c4a8,
    },
    /**
     * Temperate Deciduous Forest
     * @type TerrainZoneInfo
     */
    FOREST_DECIDUOUS: {
        description: "Temperate deciduous forest",
        moistureMin: 3,
        moistureMax: 4,
        elevation: 1,
        color: 0xb4c9a9,
    },
    /**
     * Grassland
     * @type TerrainZoneInfo
     */
    GRASSLAND: {
        description: "Grassland",
        moistureMin: 1,
        moistureMax: 2,
        elevation: 1,
        color: 0xc4d4aa,
    },
    /**
     * Temperate desert (low)
     * @type TerrainZoneInfo
     */
    DESERT_TEMPERATE_LOW: {
        description: "Temperate Desert (low)",
        moistureMin: 0,
        moistureMax: 0,
        elevation: 1,
        color: 0xe4e8ca,
    },
    /**
     * Tropical rainforest
     * @type TerrainZoneInfo
     */
    RAINFOREST_TROPICAL: {
        description: "Tropical rainforest",
        moistureMin: 4,
        moistureMax: 5,
        elevation: 0,
        color: 0x9cbba9,
    },
    /**
     * Tropical seasonal forest
     * @type TerrainZoneInfo
     */
    FOREST_TROPICAL_SEASONAL: {
        description: "Tropical seasonal forest",
        moistureMin: 2,
        moistureMax: 3,
        elevation: 0,
        color: 0xa9cca4,
    },
    /**
     * Grassland (low)
     * @type TerrainZoneInfo
     */
    GRASSLAND_LOW: {
        description: "Grassland (low)",
        moistureMin: 1,
        moistureMax: 1,
        elevation: 0,
        color: 0xc4d4aa,
    },
    /**
     * Subtropical desert
     * @type TerrainZoneInfo
     */
    DESERT_SUBTROPICAL: {
        description: "Subtropical desert",
        moistureMin: 0,
        moistureMax: 0,
        elevation: 0,
        color: 0xe9ddc7,
    },
});

const TerrainType = Object.freeze({
    SAND: Symbol("sand"),
    GRASS_LOW: Symbol("grass_low"),
    GRASS_MED: Symbol("grass_med"),
    GRASS_HIGH: Symbol("grass_high"),
    ROCK_LOW: Symbol("rock_low"),
    ROCK_MED: Symbol("rock_med"),
    ROCK_HIGH: Symbol("rock_high"),
    SNOW: Symbol("snow"),
    asArray: () => {
        return [
            TerrainType.SNOW,
            TerrainType.ROCK_HIGH,
            TerrainType.ROCK_MED,
            TerrainType.ROCK_LOW,
            TerrainType.GRASS_HIGH,
            TerrainType.GRASS_MED,
            TerrainType.GRASS_LOW,
            TerrainType.SAND,
        ];
    }
});

// Build an array of terrain zones indexed by elevation
// and moisture.
const terrainByElevAndMoisture = Array(4).fill(Array(6));

for(let key in TerrainZones) {
    const tz = TerrainZones[key];
    for(let i = tz.moistureMin; i <= tz.moistureMax; i++) {
        terrainByElevAndMoisture[tz.elevation][i] = tz;
    }
}

/**
 * Returns the terrain zone appropriate to a given elevation 
 * and moisture level.
 * @param {number} elevation The elevation of the terrain, in the 
 * range 0-3.
 * @param {number} moisture The moisture level of the terrain, in the
 * range 0-5.
 */
export const getTerrainZone = (elevation, moisture) => {
    return terrainByElevAndMoisture[elevation][moisture];
};