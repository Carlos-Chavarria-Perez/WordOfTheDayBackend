import axios from "axios";

export const getRandomWordData = async (req, res) => {
  try {
    let wordData = [];
    let attempts = 0;

    while (wordData.length<3 && attempts < 10) {
      attempts++;

      // 1️⃣ Get random word
      const wordResponse = await axios.get(
        "https://random-word-api.herokuapp.com/word",
      );

      const randomWord = wordResponse.data[0];

      try {
        // 2️⃣ Get word definition
        const dictResponse = await axios.get(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${randomWord}`,
        );

        
        const definition= dictResponse.data[0]?.meanings[0]?.definitions[0]?.definition

        if(definition){
            wordData.push({
                word: randomWord,
                definition
            })
        }
      } catch (err) {
        console.log(`Word "${randomWord}" not found, retrying...`);
      }
    }

    // 3️⃣ Final response
    if (wordData.length===3) {
      return res.json(wordData);
    } else {
      return res.status(404).json({ error: "Could not find a defined word" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error fetching word data." });
  }
};
