const MAX_POPULATION = 100000;
const MIN_POPULATION = 1;

const R = 0.5;
const K = 3000;
const BETA = 0.001;
const DELTA = 0.001;
const GAMMA = 0.25;
const EPSILON = 0.0005;
const MU = 0.075;
const dt = 0.05;

function tick(currentState) {
  let { plants, herbivores, carnivores } = currentState;

  const dPlants = R * plants * (1 - plants / K) - BETA * plants * herbivores;
  const dHerbivores = DELTA * plants * herbivores - GAMMA * herbivores - EPSILON * herbivores * carnivores;
  const dCarnivores = EPSILON * herbivores * carnivores - MU * carnivores;

  let newPlants = plants + dPlants * dt;
  let newHerbivores = herbivores + dHerbivores * dt;
  let newCarnivores = carnivores + dCarnivores * dt;

  // Rescue effect: boost when populations dip low (migration / refugia)
  if (newPlants < 20) newPlants += 0.8 * (20 - newPlants) * dt;
  if (newHerbivores < 10) newHerbivores += 0.5 * (10 - newHerbivores) * dt;
  if (newCarnivores < 5) newCarnivores += 0.5 * (5 - newCarnivores) * dt;

  newPlants = Math.min(MAX_POPULATION, Math.max(MIN_POPULATION, newPlants));
  newHerbivores = Math.min(MAX_POPULATION, Math.max(MIN_POPULATION, newHerbivores));
  newCarnivores = Math.min(MAX_POPULATION, Math.max(MIN_POPULATION, newCarnivores));

  return {
    plants: Math.round(newPlants * 100) / 100,
    herbivores: Math.round(newHerbivores * 100) / 100,
    carnivores: Math.round(newCarnivores * 100) / 100,
  };
}

function reset(initialParams) {
  return {
    plants: initialParams.plants || 1000,
    herbivores: initialParams.herbivores || 200,
    carnivores: initialParams.carnivores || 50,
  };
}

module.exports = { tick, reset };
