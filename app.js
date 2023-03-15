const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//api 1
const convertPlayerDBObject = (obj) => {
  return {
    playerId: obj.player_id,
    playerName: obj.player_name,
  };
};

//get returns a list of all the players in the player table

app.get("/players/", async (request, response) => {
  const getAllPlayersQuery = `
    select * from player_details;`;
  const getAllPlayersResponse = await db.all(getAllPlayersQuery);
  response.send(
    getAllPlayersResponse.map((eachPlayer) => convertPlayerDBObject)
  );
});

//api 2
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerByIdQuery = `select * from player_details where player_id=${playerId};`;
  const getPlayerByIDResponse = await db.get(getPlayerByIdQuery);
  response.send(convertPlayerDBObject(getPlayerByIdResponse));
});

//api 3
//updates all details of a specific player based on the playerID

app.put("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerNameQuery = `UPDATE player_details SET player_name='${playerName}' 
    WHERE player_id=${playerId}`;
  const updatePlayerNameResponse = await db.run(updatePlayerNameQuery);
  response.send("Player Details Updated");
});

//api 4
//convert match details to object
const convertMatchDetailsObject = (obj) => {
  return {
    matchId: obj.match_id,
    match: obj.match,
    year: obj.year,
  };
};
//get returns the match details of a specific match
app.get("/match/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `
    SELECT * FROM match_details WHERE match_id=${matchId}`;
  const getMatchDetailsResponse = await db.get(getMatchDetailsQuery);
  response.send(convertMatchDetailsObject(getMatchDetailsResponse));
});

//api 5
//get returns a list of all the matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerDBQuery = `SELECT * FROM player_match_score WHERE player_id=${playerId};`;
  const getMatchesOfPlayerDBResponse = await db.all(getMatchesOfPlayerDBQuery);
  const matchesIdArr = getMatchesOfPlayerDBResponse.map((eachMatch) => {
    return eachMatch.match_id;
  });
  const getMatchDetailsQuery = `SELECT * FROM match_details WHERE match_id IN (${matchesIdArr});`;
  const fetchMatchDetailsResponse = await db.all(getMatchDetailsQuery);
  response.send(
    fetchMatchDetailsResponse.map((eachMatch) =>
      convertMatchDetailsObject(eachMatch)
    )
  );
});

//api 6
//get returns a list of players of a specific match
app.get("/matches/:matchId/players/", async (request, response) => {
  const getPlayersOfMatchQuery = `
    SELECT * FROM player_match_score NATURAL_JOIN player_details 
    WHERE match_id=${matchId};`;
  const getPlayersOfMatchResponse = await db.all(getPlayersOfMatchQuery);
  response.send(
    getPlayersOfMatchResponse.map((eachPlayer) =>
      convertPlayerDBObject(eachPlayer)
    )
  );
});

//api 7

//convert player stats to object
const playerStatsObject = (playerName, statsObj) => {
  return {
    playerId: statsObj.player_id,
    playerName: playerName,
    totalScore: statsObj.totalScore,
    totalFours: statsObj.totalFours,
    totalSixes: statsObj.totalSixes,
  };
};
//get returns the statistics of the total score,fours,sixes
//of a specific player based on the playerID
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerNameQuery = `
SELECT player_name FROM player_details WHERE player_id=${playerId};`;
  const getPlayerNameResponse = await db.get(getPlayerNameQuery);
  const getPlayerStatisticsQuery = `
SELECT player_id,
sum(score) AS totalScore,
sum(fours) AS totalFours,
sum(sixes) AS totalSixes,
FROM player_match_score 
WHERE player_id=${playerId};`;
  const getPlayerStatisticsResponse = await db.all(getPlayerStatisticsQuery);
  response.send(
    playerStatsObject(
      getPlayerNameResponse.player_name,
      getPlayerStatisticsResponse
    )
  );
});

module.exports = app;
