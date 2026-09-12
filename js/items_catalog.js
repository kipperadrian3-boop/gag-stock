/**
 * Grow a Garden (GAG) - Offizieller Shop-Katalog
 * Exakte Liste aller Samen (Seeds) und Werkzeuge (Gear) aus dem Roblox-Spiel Grow a Garden,
 * in der authentischen Ingame-Reihenfolge (nach Shop-Tiers und garantiertem Stock).
 */

// Offizielle Ingame-Reihenfolge des Seed Shops (Sam's Shop)
const OFFICIAL_SEEDS_ORDER = [
  // Tier 1 & Garantierter/Häufiger Stock
  "Carrot",
  "Strawberry",
  "Blueberry",
  "Buttercup",
  "Tomato",
  "Corn",
  "Daffodil",
  // Mid Tiers (Legendary / Mythical / Divine)
  "Watermelon",
  "Pumpkin",
  "Apple",
  "Bamboo",
  "Coconut",
  "Cactus",
  "Dragon Fruit",
  "Mango",
  "Grape",
  "Mushroom",
  "Pepper",
  "Cacao",
  "Sunflower",
  // High Tiers (Prismatic / Transcendent)
  "Beanstalk",
  "Ember Lily",
  "Sugar Apple",
  "Burning Bud",
  "Giant Pinecone",
  "Elder Strawberry",
  "Romanesco",
  "Crimson Thorn",
  "Zebrazinkle",
  "Octobloom",
  // Daily Shop Pool
  "Broccoli",
  "Potato",
  "Brussels Sprout",
  "Cocomango",
  "Orange Tulip",
  "Avocado",
  "Banana",
  "Pineapple",
  "Green Apple"
];

// Offizielle Ingame-Reihenfolge des Gear Shops (Eloise's Shop)
const OFFICIAL_GEARS_ORDER = [
  // Garantierte Werkzeuge (jeden Restock im Shop)
  "Watering Can",
  "Trowel",
  "Recall Wrench",
  "Trading Ticket",
  "Favorite Tool",
  "Harvest Tool",
  // Sprinkler (nach Seltenheit geordnet)
  "Basic Sprinkler",
  "Advanced Sprinkler",
  "Godly Sprinkler",
  "Master Sprinkler",
  "Grandmaster Sprinkler",
  // Nützliche Werkzeuge & Haustier-Bedarf
  "Cleaning Spray",
  "Magnifying Glass",
  "Pet Lead",
  "Pet Name Reroller",
  "Medium Treat",
  "Medium Toy",
  "Friendship Pot"
];

// Garantierte, verifizierte Bild-URLs für alle Items (verhindert fehlende Icons!)
const VERIFIED_ITEM_IMAGES = {
  // Seeds
  "Carrot": "https://i.postimg.cc/sgCqpP6L/image.png",
  "Strawberry": "https://i.postimg.cc/FFymdsZr/Strawberry.png",
  "Blueberry": "https://i.postimg.cc/RV9SXZ7h/image.png",
  "Buttercup": "https://i.postimg.cc/rpG2zf0C/image.png",
  "Tomato": "https://i.postimg.cc/MGhxR6ZW/image.png",
  "Corn": "https://i.postimg.cc/0QG3Qrqh/Corn.png",
  "Daffodil": "https://i.postimg.cc/Z57Jb7L6/Daffodil.png",
  "Watermelon": "https://i.postimg.cc/kXsB3bsL/image.png",
  "Pumpkin": "https://i.postimg.cc/3xWPBKgD/Pumpkin.png",
  "Apple": "https://i.postimg.cc/d1MP3zZZ/Apple.png",
  "Bamboo": "https://i.postimg.cc/5NshLHFV/Bamboo.png",
  "Coconut": "https://i.postimg.cc/90JndS0p/Coconut.png",
  "Cactus": "https://i.postimg.cc/0jssWL81/Cactus.png",
  "Dragon Fruit": "https://i.postimg.cc/7Yq4g8sg/Dragon-Fruit.png",
  "Mango": "https://i.postimg.cc/MGgxRnNT/Mango.png",
  "Grape": "https://i.postimg.cc/0y3hXLfX/Grape.png",
  "Mushroom": "https://i.postimg.cc/cHW9VZ8h/Mushroom.png",
  "Pepper": "https://i.postimg.cc/59gq262W/image.png",
  "Cacao": "https://i.postimg.cc/KvY7kx1k/image.png",
  "Sunflower": "https://i.postimg.cc/2jvqwZFh/image.png",
  "Beanstalk": "https://i.postimg.cc/dVL0hP8R/image.png",
  "Ember Lily": "https://i.postimg.cc/4db04jRH/image.png",
  "Sugar Apple": "https://i.postimg.cc/jjLmLYgX/image.png",
  "Burning Bud": "https://i.postimg.cc/2Syt3f35/image.png",
  "Giant Pinecone": "https://i.postimg.cc/YqWhcDS9/image.png",
  "Elder Strawberry": "https://i.postimg.cc/zXYvyScs/image.png",
  "Romanesco": "https://i.postimg.cc/vT8FVj2z/image.png",
  "Crimson Thorn": "https://i.postimg.cc/Gpmf9Lhc/image.png",
  "Zebrazinkle": "https://static.wikia.nocookie.net/growagarden/images/9/98/Zebrazinkle.png/revision/latest",
  "Octobloom": "https://static.wikia.nocookie.net/growagarden/images/b/be/OctobloomProduce.png/revision/latest",
  "Broccoli": "https://i.postimg.cc/766CBJyH/image.png",
  "Potato": "https://i.postimg.cc/3w30vbSD/image.png",
  "Brussels Sprout": "https://i.postimg.cc/prSKQYhM/image.png",
  "Cocomango": "https://i.postimg.cc/3wQCbBLK/image.png",
  "Orange Tulip": "https://i.postimg.cc/BQ3SM16P/Orange-Tulip.png",
  "Avocado": "https://i.postimg.cc/pLLvhb0T/Avocadocrop2.png",
  "Banana": "https://i.postimg.cc/Df1nRcJ2/Banana-Pic.png",
  "Pineapple": "https://i.postimg.cc/ZnzZCWgt/Pineapple-Fruit-Icon.png",
  "Green Apple": "https://i.postimg.cc/5tHMg5WW/Green-apple-produce.png",

  // Gear / Tools
  "Watering Can": "https://i.postimg.cc/3JPcnJgS/image.png",
  "Trowel": "https://i.postimg.cc/43RjNNy7/image.png",
  "Recall Wrench": "https://i.postimg.cc/wvPFZrxm/image.png",
  "Trading Ticket": "https://i.postimg.cc/yNkS97CT/image.png",
  "Favorite Tool": "https://i.postimg.cc/ZK7qnhNq/image.png",
  "Harvest Tool": "https://i.postimg.cc/pVD2DNKm/image.png",
  "Basic Sprinkler": "https://i.postimg.cc/zBjtN7c9/image.png",
  "Advanced Sprinkler": "https://i.postimg.cc/ZKkcQ1nC/image.png",
  "Godly Sprinkler": "https://i.postimg.cc/g0r8jDjC/image.png",
  "Master Sprinkler": "https://i.postimg.cc/SKMSs2LS/image.png",
  "Grandmaster Sprinkler": "https://i.postimg.cc/yYmhY67g/image.png",
  "Cleaning Spray": "https://i.postimg.cc/c4wzncBp/image.png",
  "Magnifying Glass": "https://static.wikia.nocookie.net/growagarden/images/7/7e/Magnifying_Glass_Icon.png/revision/latest",
  "Pet Lead": "https://static.wikia.nocookie.net/growagarden/images/e/ea/PetLead.png/revision/latest",
  "Pet Name Reroller": "https://static.wikia.nocookie.net/growagarden/images/6/6d/PetNameReroller.png/revision/latest",
  "Medium Treat": "https://static.wikia.nocookie.net/growagarden/images/9/93/MediumTreat.png/revision/latest",
  "Medium Toy": "https://static.wikia.nocookie.net/growagarden/images/c/c1/MediumToy.png/revision/latest",
  "Friendship Pot": "https://i.postimg.cc/g2bLP74P/image.png"
};

// Fallback-Icons
const FALLBACK_EMOJIS = {
  seeds: "🌱",
  gear: "🛠️",
  cosmetics: "🎨"
};
