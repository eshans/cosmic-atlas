// Fixed facts per planet, from NASA's Planetary Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet).
// Moon counts change as new ones are confirmed; these are as of 2025.

export type PlanetName = 'Mercury' | 'Venus' | 'Earth' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune'

export interface PlanetInfo {
  name: PlanetName
  kind: 'Rocky' | 'Gas giant' | 'Ice giant'
  color: string
  dotRadius: number // drawing size on the map (not to scale)
  diameterMi: number
  dayHours: number // solar day (sunrise to sunrise)
  yearDays: number // orbital period in Earth days
  moons: number
  meanTempF: number
  blurb: string
}

export const PLANETS: PlanetInfo[] = [
  {
    name: 'Mercury', kind: 'Rocky', color: '#b7aea4', dotRadius: 4,
    diameterMi: 3032, dayHours: 4222.6, yearDays: 88.0, moons: 0, meanTempF: 333,
    blurb: 'The smallest planet and the closest to the Sun. One day there lasts two of its years.',
  },
  {
    name: 'Venus', kind: 'Rocky', color: '#f1d39a', dotRadius: 6,
    diameterMi: 7521, dayHours: 2802, yearDays: 224.7, moons: 0, meanTempF: 867,
    blurb: 'The hottest planet, with a thick CO₂ atmosphere. It spins backwards, so the Sun rises in the west.',
  },
  {
    name: 'Earth', kind: 'Rocky', color: '#6fb6ff', dotRadius: 6.5,
    diameterMi: 7926, dayHours: 24, yearDays: 365.2, moons: 1, meanTempF: 59,
    blurb: 'Home, and the only place we know of with liquid water oceans on the surface.',
  },
  {
    name: 'Mars', kind: 'Rocky', color: '#ff7a4d', dotRadius: 5,
    diameterMi: 4221, dayHours: 24.7, yearDays: 687.0, moons: 2, meanTempF: -85,
    blurb: 'A cold desert with the tallest volcano in the solar system, Olympus Mons.',
  },
  {
    name: 'Jupiter', kind: 'Gas giant', color: '#e2b27c', dotRadius: 13,
    diameterMi: 88846, dayHours: 9.9, yearDays: 4331, moons: 95, meanTempF: -166,
    blurb: 'More than twice as massive as every other planet combined. The Great Red Spot is a storm wider than Earth.',
  },
  {
    name: 'Saturn', kind: 'Gas giant', color: '#f0d9a0', dotRadius: 11,
    diameterMi: 74898, dayHours: 10.7, yearDays: 10747, moons: 274, meanTempF: -220,
    blurb: 'Its rings are mostly water ice and span about 175,000 miles, yet are often less than a kilometer thick.',
  },
  {
    name: 'Uranus', kind: 'Ice giant', color: '#9fe5e8', dotRadius: 9,
    diameterMi: 31763, dayHours: 17.2, yearDays: 30589, moons: 29, meanTempF: -320,
    blurb: 'Tipped on its side by about 98°, so each pole gets 42 years of sunlight followed by 42 of darkness.',
  },
  {
    name: 'Neptune', kind: 'Ice giant', color: '#5b7cff', dotRadius: 9,
    diameterMi: 30775, dayHours: 16.1, yearDays: 59800, moons: 16, meanTempF: -330,
    blurb: 'The windiest planet, with gusts over 1,200 mph. It has completed only one orbit since its 1846 discovery.',
  },
]

/** Seconds light takes to travel one astronomical unit. */
export const LIGHT_SECONDS_PER_AU = 499.005
export const MILES_PER_AU = 92_955_807.3
