const test = [
  {
    name: "BTCUSDT",
    priority: 1
  },
  {
    name: "ETCUSDT",
    priority: 2
  },
  {
    name: "DOGEUSDT",
    priority: 3
  }
];


function sortRandomByPriority(test, Random) {
  // Create a map to store the priority values of each item in the test array
  const priorityMap = new Map();

  test.forEach(item => {
    priorityMap.set(item.name, item.priority);
  });

  // Sort the Random array based on the priority values from the map
  Random.sort((a, b) => priorityMap.get(a) - priorityMap.get(b));

  return Random;
}

const sortedRandom = sortRandomByPriority(test, Random);
console.log(sortedRandom);
