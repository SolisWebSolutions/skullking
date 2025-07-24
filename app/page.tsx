"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Minus, RotateCcw, Edit3, Trophy, Users, Target } from "lucide-react"

interface Player {
  id: string
  name: string
  scores: number[]
  bids: number[]
  tricks: number[]
  bonuses: string[][]
}

interface GameState {
  players: Player[]
  currentRound: number
  maxRounds: number
  gameStarted: boolean
  gameEnded: boolean
}

const BONUS_OPTIONS = [
  { value: "yellow14", label: "Yellow 14", points: 10, color: "bg-yellow-500" },
  { value: "green14", label: "Green 14", points: 10, color: "bg-green-500" },
  { value: "purple14", label: "Purple 14", points: 10, color: "bg-purple-500" },
  { value: "black14", label: "Black 14/Jolly Roger", points: 20, color: "bg-gray-800" },
  { value: "mermaid_pirate", label: "Mermaid captured by Pirate", points: 20, color: "bg-blue-500" },
  { value: "pirate_skullking", label: "Pirate captured by Skull King", points: 30, color: "bg-red-600" },
  { value: "skullking_mermaid", label: "Skull King captured by Mermaid", points: 40, color: "bg-pink-600" },
]

export default function SkullKingApp() {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentRound: 1,
    maxRounds: 10,
    gameStarted: false,
    gameEnded: false,
  })
  const [playerName, setPlayerName] = useState("")

  // New: Track round input state for each player
  const [roundInputs, setRoundInputs] = useState<{
    [playerId: string]: { bid: number; tricks: number; bonuses: string[] }
  }>({})

  // When currentRound or players change, reset roundInputs to match gameState
  useEffect(() => {
    const initialInputs: { [playerId: string]: { bid: number; tricks: number; bonuses: string[] } } = {}
    gameState.players.forEach((player) => {
      initialInputs[player.id] = {
        bid: player.bids[gameState.currentRound - 1] || 0,
        tricks: player.tricks[gameState.currentRound - 1] || 0,
        bonuses: player.bonuses[gameState.currentRound - 1] || [],
      }
    })
    setRoundInputs(initialInputs)
  }, [gameState.currentRound, gameState.players])

  // Load game state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem("skullKingGame")
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setGameState(parsed)
      } catch (error) {
        console.error("Error loading saved game:", error)
      }
    }
  }, [])

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("skullKingGame", JSON.stringify(gameState))
  }, [gameState])

  const addPlayer = () => {
    if (playerName.trim() && gameState.players.length < 10) {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: playerName.trim(),
        scores: [],
        bids: [],
        tricks: [],
        bonuses: [],
      }
      setGameState((prev) => ({
        ...prev,
        players: [...prev.players, newPlayer],
      }))
      setPlayerName("")
    }
  }

  const removePlayer = (playerId: string) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }))
  }

  const startGame = () => {
    if (gameState.players.length >= 2) {
      setGameState((prev) => ({
        ...prev,
        gameStarted: true,
        currentRound: 1,
        gameEnded: false,
      }))
    }
  }

  const resetGame = () => {
    setGameState({
      players: [],
      currentRound: 1,
      maxRounds: 10,
      gameStarted: false,
      gameEnded: false,
    })
  }

  const calculateScore = (bid: number, tricks: number, round: number, bonuses: string[]): number => {
    let score = 0

    if (bid === 0) {
      // Zero bid
      if (tricks === 0) {
        score = 10 * round // Successful zero bid
      } else {
        score = -10 * round // Failed zero bid
      }
    } else {
      // Non-zero bid
      if (bid === tricks) {
        score = 20 * bid // Correct bid
      } else {
        score = -10 * Math.abs(bid - tricks) // Incorrect bid
      }
    }

    // Add bonus points only if bid was met
    if (bid === tricks || (bid === 0 && tricks === 0)) {
      bonuses.forEach((bonus) => {
        const bonusOption = BONUS_OPTIONS.find((b) => b.value === bonus)
        if (bonusOption) {
          score += bonusOption.points
        }
      })
    }

    return score
  }

  const updatePlayerRound = (playerId: string, bid: number, tricks: number, bonuses: string[]) => {
    setGameState((prev) => {
      const updatedPlayers = prev.players.map((player) => {
        if (player.id === playerId) {
          const newBids = [...player.bids]
          const newTricks = [...player.tricks]
          const newBonuses = [...player.bonuses]
          const newScores = [...player.scores]

          // Update or add round data
          if (prev.currentRound <= newBids.length) {
            // Update existing round
            newBids[prev.currentRound - 1] = bid
            newTricks[prev.currentRound - 1] = tricks
            newBonuses[prev.currentRound - 1] = bonuses
          } else {
            // Add new round
            newBids.push(bid)
            newTricks.push(tricks)
            newBonuses.push(bonuses)
          }

          // Recalculate all scores
          newScores.length = 0
          for (let i = 0; i < newBids.length; i++) {
            const roundScore = calculateScore(newBids[i], newTricks[i], i + 1, newBonuses[i] || [])
            newScores.push(roundScore)
          }

          return {
            ...player,
            bids: newBids,
            tricks: newTricks,
            bonuses: newBonuses,
            scores: newScores,
          }
        }
        return player
      })

      return {
        ...prev,
        players: updatedPlayers,
      }
    })
  }

  const nextRound = () => {
    if (gameState.currentRound < gameState.maxRounds) {
      setGameState((prev) => ({
        ...prev,
        currentRound: prev.currentRound + 1,
      }))
    } else {
      setGameState((prev) => ({
        ...prev,
        gameEnded: true,
      }))
    }
  }

  const getTotalScore = (player: Player): number => {
    return player.scores.reduce((sum, score) => sum + score, 0)
  }

  const getRankedPlayers = () => {
    return [...gameState.players]
      .map((player) => ({ ...player, totalScore: getTotalScore(player) }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((player, index) => ({ ...player, rank: index + 1 }))
  }

  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return "🥇"
      case 2:
        return "🥈"
      case 3:
        return "🥉"
      default:
        return `${rank}.`
    }
  }

  // Add this function in SkullKingApp:
  const handleNextRound = () => {
    gameState.players.forEach((player) => {
      const input = roundInputs[player.id] || { bid: 0, tricks: 0, bonuses: [] }
      updatePlayerRound(player.id, input.bid, input.tricks, input.bonuses)
    })
    nextRound()
  }

  if (!gameState.gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">Skull King</h1>
            <p className="text-xl text-blue-200 mb-6">Scorekeeper</p>
            <div className="mb-4 flex justify-center">
              <img src="/cres-pirate.png" alt="Pirate Flag" className="h-48 w-48 object-contain rotate-0" />
            </div>
          </div>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-6 w-6" />
                Add Players (2-10)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter player name"
                  className="bg-white/20 border-white/30 text-white placeholder-white/60"
                  onKeyPress={(e) => e.key === "Enter" && addPlayer()}
                />
                <Button
                  onClick={addPlayer}
                  disabled={!playerName.trim() || gameState.players.length >= 10}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {gameState.players.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-white font-semibold">Players ({gameState.players.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {gameState.players.map((player) => (
                      <div key={player.id} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <span className="text-white font-medium">{player.name}</span>
                        <Button
                          onClick={() => removePlayer(player.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gameState.players.length >= 2 && (
                <div className="text-center pt-4">
                  <Button
                    onClick={startGame}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    <Target className="h-5 w-5 mr-2" />
                    Start Game ({gameState.players.length} players)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState.gameEnded) {
    const rankedPlayers = getRankedPlayers()

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">Game Over!</h1>
            <p className="text-xl text-blue-200">Final Rankings</p>
          </div>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Final Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rankedPlayers.map((player) => (
                  <div key={player.id} className="flex items-center justify-between bg-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{getRankEmoji(player.rank)}</span>
                      <div>
                        <div className="font-bold text-lg text-white">{player.name}</div>
                        <div className="text-sm text-blue-200">Rank #{player.rank}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{player.totalScore}</div>
                      <div className="text-sm text-blue-200">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button onClick={resetGame} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              <RotateCcw className="h-5 w-5 mr-2" />
              New Game
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🏴‍☠️</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Skull King</h1>
          <div className="flex justify-center items-center gap-4 text-white/80">
            <Badge variant="secondary" className="bg-white/20 text-white">
              Round {gameState.currentRound} of {gameState.maxRounds}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white">
              {gameState.currentRound} cards per player
            </Badge>
          </div>
        </div>

        {/* Round Input Section */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Round {gameState.currentRound} Input</CardTitle>
              <div className="flex gap-2">
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {gameState.players.map((player) => (
                <RoundInput
                  key={player.id}
                  player={player}
                  round={gameState.currentRound}
                  bid={roundInputs[player.id]?.bid ?? 0}
                  tricks={roundInputs[player.id]?.tricks ?? 0}
                  bonuses={roundInputs[player.id]?.bonuses ?? []}
                  setBid={(bid) => setRoundInputs((prev) => ({ ...prev, [player.id]: { ...prev[player.id], bid } }))}
                  setTricks={(tricks) => setRoundInputs((prev) => ({ ...prev, [player.id]: { ...prev[player.id], tricks } }))}
                  setBonuses={(bonuses) => setRoundInputs((prev) => ({ ...prev, [player.id]: { ...prev[player.id], bonuses } }))}
                />
              ))}
            </div>
            <Separator className="my-6 bg-white/20" />
            <div className="text-center">
              <Button onClick={handleNextRound} size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold">
                {gameState.currentRound === gameState.maxRounds ? "Finish Game" : "Next Round"}
                <Plus className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Score Table */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Score Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left p-3 text-white font-semibold">Player</th>
                    {Array.from({ length: gameState.currentRound }, (_, i) => (
                      <th key={i} className="p-3 text-center text-white font-semibold min-w-[80px]">
                        R{i + 1}
                      </th>
                    ))}
                    <th className="p-3 text-center text-white font-bold min-w-[100px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {getRankedPlayers().map((player) => (
                    <tr key={player.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getRankEmoji(player.rank)}</span>
                          <span className="font-medium text-white">{player.name}</span>
                        </div>
                      </td>
                      {Array.from({ length: gameState.currentRound }, (_, i) => {
                        const score = player.scores[i];
                        const bid = player.bids[i];
                        const tricks = player.tricks[i];
                        return (
                          <td key={i} className="p-3 text-center">
                            <div className="space-y-1">
                              <div className="text-xs text-white/60">
                                {bid}/{tricks}
                              </div>
                              <div
                                className={`font-bold ${
                                  score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-white/60"
                                }`}
                              >
                                {score > 0 ? "+" : ""}
                                {score}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <div
                          className={`font-bold text-lg ${
                            player.totalScore > 0
                              ? "text-green-400"
                              : player.totalScore < 0
                                ? "text-red-400"
                                : "text-white"
                          }`}
                        >
                          {player.totalScore > 0 ? "+" : ""}
                          {player.totalScore}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <Button
            onClick={resetGame}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/20 bg-transparent"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            New Game
          </Button>
        </div>
      </div>
    </div>
  )
}

interface RoundInputProps {
  player: Player
  round: number
  bid: number
  tricks: number
  bonuses: string[]
  setBid: (bid: number) => void
  setTricks: (tricks: number) => void
  setBonuses: (bonuses: string[]) => void
}

function RoundInput({ player, round, bid, tricks, bonuses, setBid, setTricks, setBonuses }: RoundInputProps) {
  const handleBidChange = (newBid: number) => {
    setBid(newBid)
  }

  const handleTricksChange = (newTricks: number) => {
    setTricks(newTricks)
  }

  const handleBonusToggle = (bonusValue: string) => {
    const newBonuses = bonuses.includes(bonusValue) ? bonuses.filter((b) => b !== bonusValue) : [...bonuses, bonusValue]
    setBonuses(newBonuses)
  }

  const calculateScore = (bid: number, tricks: number, round: number, bonuses: string[]): number => {
    let score = 0

    if (bid === 0) {
      if (tricks === 0) {
        score = 10 * round
      } else {
        score = -10 * round
      }
    } else {
      if (bid === tricks) {
        score = 20 * bid
      } else {
        score = -10 * Math.abs(bid - tricks)
      }
    }

    if (bid === tricks || (bid === 0 && tricks === 0)) {
      bonuses.forEach((bonus) => {
        const bonusOption = BONUS_OPTIONS.find((b) => b.value === bonus)
        if (bonusOption) {
          score += bonusOption.points
        }
      })
    }

    return score
  }

  const roundScore = calculateScore(bid, tricks, round, bonuses)

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg">{player.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bid Input */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Bid (0-{round})</label>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: round + 1 }, (_, i) => (
              <Button
                key={i}
                onClick={() => handleBidChange(i)}
                variant={bid === i ? "default" : "outline"}
                size="sm"
                className={
                  bid === i
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-white/50 text-white bg-white/10 hover:bg-white/20 hover:border-white/70"
                }
              >
                {i}
              </Button>
            ))}
          </div>
        </div>

        {/* Tricks Input */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Hands Won</label>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleTricksChange(Math.max(0, tricks - 1))}
              variant="outline"
              size="sm"
              className="border-red-400/50 text-red-400 hover:bg-red-400/20"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-white/20 rounded-md min-w-[3rem] text-center text-white font-semibold">
              {tricks}
            </div>
            <Button
              onClick={() => handleTricksChange(Math.min(round, tricks + 1))}
              variant="outline"
              size="sm"
              className="border-green-400/50 text-green-400 hover:bg-green-400/20"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bonus Points */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Bonus Points</label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {BONUS_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${player.id}-${option.value}`}
                  checked={bonuses.includes(option.value)}
                  onCheckedChange={() => handleBonusToggle(option.value)}
                  className="border-white/30"
                />
                <label
                  htmlFor={`${player.id}-${option.value}`}
                  className="text-sm text-white/90 cursor-pointer flex items-center gap-2"
                >
                  <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                  {option.label}
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                    +{option.points}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Round Score Preview */}
        <Separator className="bg-white/20" />
        <div className="text-center">
          <div className="text-sm text-white/60 mb-1">Round Score</div>
          <div
            className={`text-xl font-bold ${
              roundScore > 0 ? "text-green-400" : roundScore < 0 ? "text-red-400" : "text-white"
            }`}
          >
            {roundScore > 0 ? "+" : ""}
            {roundScore}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
