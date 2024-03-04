const SUITS = ["♠", "♣", "♥", "♦"];
const RANKS = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const bell = new Audio("./assets/sounds/bell.mp3");
const win = new Audio("./assets/sounds/win.mp3");
const deck_shuffle = new Audio("./assets/sounds/deck_shuffle.mp3");
const card_lay = new Audio("./assets/sounds/card_lay.mp3");
const card_lay2 = new Audio("./assets/sounds/card_lay2.mp3");
const card_lay3 = new Audio("./assets/sounds/card_lay3.mp3");
const card_lay_trump = new Audio("./assets/sounds/card_lay_trump.mp3");

//declaring souds as variables

const gameStates = {
  player1Turn: 0,
  player2Turn: 1,
  endGame: 2,
};
class Card {
  suit;
  rank;

  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }

  color() {
    if (this.suit == "♥" || this.suit == "♦") {
      return "red";
    }
    return "black";
  }

  evaluateRank() {
    return RANKS.indexOf(this.rank);
  }

  evaluateSuit() {
    return SUITS.indexOf(this.suit);
  }

  compare(secondCard, trumpSuit) {
    if (this.suit === trumpSuit && secondCard.suit !== trumpSuit) {
      return 1;
    }

    if (this.suit !== trumpSuit && secondCard.suit === trumpSuit) {
      return -1;
    }
    if (this.evaluateSuit() === secondCard.evaluateSuit()) {
      return this.evaluateRank() - secondCard.evaluateRank();
    }
    return this.evaluateRank() - secondCard.evaluateRank();
  }
}

class Deck {
  #deck;
  #topCard = 0;

  constructor() {
    this.#deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.#deck.push(new Card(suit, rank));
      }
    }
  }

  shuffle() {
    for (let i = 0; i < this.#deck.length; i++) {
      const tmp = this.#deck[i];
      const randIndex = Math.floor(Math.random() * this.#deck.length);
      this.#deck[i] = this.#deck[randIndex];
      this.#deck[randIndex] = tmp;
    }
  }

  dealOne() {
    const dealedCard = this.#deck[this.#topCard];
    this.#topCard++;
    return dealedCard;
  }

  getBottomCard() {
    return this.#deck[this.#deck.length - 1];
  }

  count() {
    return this.#deck.length - this.#topCard;
  }
}

class Hand {
  cards = [];

  addCard(card, trumpSuit) {
    this.cards.splice(
      this.findInsertIndex(card, trumpSuit, 0, this.cards.length - 1),
      0,
      card
    );
  }

  findInsertIndex(card, trumpSuit, from, to) {
    if (this.cards.length == 0) {
      return 0;
    }

    if (to == from) {
      if (card.compare(this.cards[to], trumpSuit) < 0) {
        return from + 1;
      }
      return from;
    }

    if (to - from == 1) {
      if (card.compare(this.cards[from], trumpSuit) > 0) {
        return from;
      }
      return this.findInsertIndex(card, trumpSuit, to, to);
    }

    let middleIndex = Math.floor((from + to) / 2);

    if (card.compare(this.cards[middleIndex], trumpSuit) == 0) {
      return middleIndex;
    }
    if (card.compare(this.cards[middleIndex], trumpSuit) > 0) {
      return this.findInsertIndex(card, trumpSuit, from, middleIndex - 1);
    }
    return this.findInsertIndex(card, trumpSuit, middleIndex + 1, to);
  }

  playCard(index) {
    const playCard = this.cards[index];
    this.cards.splice(index, 1);
    return playCard;
  }

  // sortCards(trumpSuit) {
  //   for (let i = 0; i < this.cards.length - 1; i++) {
  //     for (let j = 0; j < this.cards.length - i - 1; j++) {
  //       if (this.cards[j].compare(this.cards[j + 1], trumpSuit) > 0) {
  //         const tmp = this.cards[j];
  //         this.cards[j] = this.cards[j + 1];
  //         this.cards[j + 1] = tmp;
  //       }
  //     }
  //   }
  // }
}

class Game {
  deck;
  player1Hand;
  player2Hand;
  trumpCard;
  battleArea;
  beatenCards;
  gameState;
  endGameText;

  newStart() {
    this.gameState = gameStates.player1Turn;

    this.deck = new Deck();
    this.deck.shuffle();
    this.trumpCard = this.deck.getBottomCard();
    this.battleArea = new BattleArea(this.trumpCard.suit);

    this.player1Hand = new Hand();
    this.dealHand(this.player1Hand, 6);
    this.player2Hand = new Hand();
    this.dealHand(this.player2Hand, 6);
    this.beatenCards = [];
  }

  dealHand(hand, count) {
    for (let i = hand.cards.length; i < count && this.deck.count() > 0; i++) {
      hand.addCard(this.deck.dealOne(), this.trumpCard.suit);
    }
  }

  #getTurn() {
    let attackHand = this.player1Hand;
    let defenceHand = this.player2Hand;
    if (this.gameState == gameStates.player1Turn) {
      attackHand = this.player2Hand;
      defenceHand = this.player1Hand;
    }
    return { attackHand, defenceHand };
  }

  tryAttack(index) {
    const { attackHand, defenceHand } = this.#getTurn();
    if (!this.battleArea.canAttack(attackHand.cards[index])) {
      return;
    }

    if (defenceHand.cards.length == 0) {
      return;
    }

    const newAttackCard = attackHand.playCard(index);
    const newPair = new Pair(newAttackCard);
    this.battleArea.addPair(newPair);
  }

  tryDefend(pairIndex, index) {
    const { attackHand, defenceHand } = this.#getTurn();
    const pair = this.battleArea.cardPairs[pairIndex];

    if (!this.battleArea.canDefend(pair, defenceHand.cards[index])) {
      return;
    }

    this.battleArea.defend(pair, defenceHand.playCard(index));
  }

  collectCards() {
    const { attackHand, defenceHand } = this.#getTurn();
    const pairs = this.battleArea.cardPairs;
    for (const pair of pairs) {
      defenceHand.addCard(pair.attackCard, this.trumpCard.suit);
      if (pair.isDefeated()) {
        defenceHand.addCard(pair.defenceCard, this.trumpCard.suit);
      }
    }
    this.battleArea.clear();
    this.dealHand(attackHand, 6);
    this.checkEnd();
  }

  checkEnd() {
    if (this.deck.count() > 0) {
      return false;
    }
    if (
      this.player1Hand.cards.length == 0 ||
      this.player2Hand.cards.length == 0
    ) {
      this.gameState = gameStates.endGame;
      if (
        this.player1Hand.cards.length == 0 &&
        this.player2Hand.cards.length == 0
      ) {
        endGameText = "Draw";
      } else if (this.player1Hand.cards.length == 0) {
        endGameText = "You win";
      } else {
        endGameText = "Soulless machine wins";
      }
      return true;
    }
  }

  beaten() {
    const { attackHand, defenceHand } = this.#getTurn();
    if (!this.battleArea.isDefeated()) {
      return false;
    }
    const pairs = this.battleArea.cardPairs;
    for (const pair of pairs) {
      this.beatenCards.push(pair.attackCard);
      this.beatenCards.push(pair.defenceCard);
    }
    this.battleArea.clear();
    this.dealHand(attackHand, 6);
    this.dealHand(defenceHand, 6);

    if (this.gameState == gameStates.player1Turn) {
      this.gameState = gameStates.player2Turn;
    } else {
      this.gameState = gameStates.player1Turn;
    }
    this.checkEnd();
    return true;
  }

  findDefendablePairs(cardIndex) {
    const { defenceHand } = this.#getTurn();
    let defendablePairs = [];
    let pairs = this.battleArea.cardPairs;

    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
      if (
        this.battleArea.canDefend(
          pairs[pairIndex],
          defenceHand.cards[cardIndex]
        )
      ) {
        defendablePairs.push(pairIndex);
      }
    }
    return defendablePairs;
  }
}

class Opponent {
  game;
  hand;

  constructor(game, hand) {
    this.game = game;
    this.hand = hand;
  }

  tryAttack() {
    for (
      let cardIndex = this.hand.cards.length - 1;
      cardIndex >= 0;
      cardIndex--
    ) {
      if (this.game.battleArea.canAttack(this.hand.cards[cardIndex])) {
        this.game.tryAttack(cardIndex);
        return;
      }
    }
    this.game.beaten();
  }

  tryDefend() {
    let pairs = this.game.battleArea.cardPairs;
    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
      for (
        let cardIndex = this.hand.cards.length - 1;
        cardIndex >= 0;
        cardIndex--
      ) {
        let card = this.hand.cards[cardIndex];
        if (this.game.battleArea.canDefend(pairs[pairIndex], card)) {
          this.game.tryDefend(pairIndex, cardIndex);
        }
      }
    }
    if (!this.game.battleArea.isDefeated()) {
      this.game.collectCards();
    }
  }
}

class BattleArea {
  cardPairs = [];
  trumpSuit;

  constructor(trumpSuit) {
    this.trumpSuit = trumpSuit;
  }

  addPair(pair) {
    this.cardPairs.push(pair);
  }

  defend(pair, defenceCard) {
    pair.defend(defenceCard);
  }

  canAttack(attackCard) {
    if (this.cardPairs.length == 0) {
      return true;
    }
    for (let pair of this.cardPairs) {
      if (
        pair.attackCard.rank == attackCard.rank ||
        (pair.defenceCard && pair.defenceCard.rank == attackCard.rank)
      ) {
        return true;
      }
    }
    return false;
  }

  canDefend(pair, defenceCard) {
    if (pair.isDefeated()) {
      return false;
    }
    return pair.checkRank(this.trumpSuit, defenceCard);
  }

  isDefeated() {
    for (let pair of this.cardPairs) {
      if (!pair.isDefeated()) {
        return false;
      }
    }
    return true;
  }

  clear() {
    this.cardPairs.length = 0;
  }
}

class Pair {
  attackCard;
  defenceCard;

  constructor(attackCard) {
    this.attackCard = attackCard;
  }

  defend(defenceCard) {
    this.defenceCard = defenceCard;
  }

  checkRank(trumpSuit, defenceCard) {
    if (this.attackCard.suit !== trumpSuit && defenceCard.suit == trumpSuit) {
      return true;
    }
    if (defenceCard.suit == this.attackCard.suit) {
      if (defenceCard.evaluateRank() > this.attackCard.evaluateRank()) {
        return true;
      }
      return false;
    }
    return false;
  }

  isDefeated() {
    return this.defenceCard !== undefined;
  }
}

let game = null;
let opponent = null;

function updateGameUI() {
  const deckAreaContainer = document.getElementById("deckArea");
  const player1HandContainer = document.getElementById("Player1Hand");
  const player2HandContainer = document.getElementById("Player2Hand");
  const battleArea = document.getElementById("battleArea");

  if (!document.getElementById("trumpCard")) {
    const trumpCardDiv = document.createElement("div");
    trumpCardDiv.className = "trumpCard";
    trumpCardDiv.id = "trumpCard";
    deckAreaContainer.appendChild(trumpCardDiv);
    showCard("trumpCard", game.trumpCard);
  }

  player1HandContainer.innerHTML = "";
  game.player1Hand.cards.forEach((card, index) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.id = `player1Hand${index}`;
    player1HandContainer.appendChild(cardDiv);
    showCard(cardDiv.id, card);
  });

  player2HandContainer.innerHTML = "";
  game.player2Hand.cards.forEach((card, index) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.id = `player2Hand${index}`;
    cardDiv.setAttribute("onClick", `handleCardClick(${index})`);
    player2HandContainer.appendChild(cardDiv);
    showCard(cardDiv.id, card);
  });

  battleArea.innerHTML = "";
  game.battleArea.cardPairs.forEach((pair, index) => {
    const cardPairDiv = document.createElement("div");
    cardPairDiv.className = "cardPair";
    cardPairDiv.id = `pair${index}`;
    const attackCardDiv = document.createElement("div");
    attackCardDiv.className = "attackCard";
    attackCardDiv.id = `pair${index}_attackCard`;
    attackCardDiv.setAttribute("onClick", `handleAttackCardClick(${index})`);
    battleArea.appendChild(cardPairDiv);
    cardPairDiv.appendChild(attackCardDiv);
    showCard(attackCardDiv.id, pair.attackCard);

    if (pair.isDefeated()) {
      const defenceCardDiv = document.createElement("div");
      defenceCardDiv.className = "defenceCard";
      defenceCardDiv.id = `pair${index}_defenceCard`;
      cardPairDiv.appendChild(defenceCardDiv);
      showCard(defenceCardDiv.id, pair.defenceCard);
    }
  });

  logState();
}

function playRandomCardSound() {
  const sounds = [card_lay, card_lay2, card_lay3];
  const randomIndex = Math.floor(Math.random() * sounds.length);
  sounds.forEach((sound) => sound.pause());
  sounds[randomIndex].play();
}

let awaitingCardIndex = null;
let currentDefendablePairs = null;

function handleCardClick(cardIndex) {
  playRandomCardSound();
  if (game.gameState == gameStates.player1Turn) {
    game.tryAttack(cardIndex);
    updateGameUI();
    setTimeout(() => {
      opponent.tryDefend();
      updateGameUI();
    }, 1000);
  } else if (game.gameState == gameStates.player2Turn) {
    const defendablePairs = game.findDefendablePairs(cardIndex);
    if (defendablePairs.length == 0) {
      alert("hablahablgha");
    } else if (defendablePairs.length == 1) {
      game.tryDefend(defendablePairs[0], cardIndex);
      updateGameUI();
      setTimeout(() => {
        opponent.tryAttack();
        updateGameUI();
      }, 1000);
    } else {
      awaitingCardIndex = cardIndex;
      currentDefendablePairs = defendablePairs;
    }
  }
}

function handleBeaten() {
  if (game.gameState === gameStates.player1Turn) {
    if (game.beaten()) {
      if (game.gameState !== gameStates.endGame) {
        setTimeout(() => {
          opponent.tryAttack();
          updateGameUI();
        }, 1000);
      }
    }
  }
  else if (game.gameState === gameStates.player2Turn) {
    game.collectCards();
    if (game.gameState !== gameStates.endGame) {
      setTimeout(() => {
        opponent.tryAttack();
        updateGameUI();
      }, 1000);
    }
  }  
  updateGameUI();
}

function handleAttackCardClick(pairIndex) {
  if (awaitingCardIndex == null) {
    return;
  }
  if (currentDefendablePairs.contains(pairIndex)) {
    game.tryDefend(pairIndex, cardIndex);
    updateGameUI();
    setTimeout(() => {
      opponent.tryAttack();
      updateGameUI();
    }, 1000);
    awaitingCardIndex = null;
    currentDefendablePairs = null;
  }
}

function playAudioWithDelay(audio, delay) {
  setTimeout(() => {
    audio.play();
  }, delay);
}

function handleStartGame() {
  game = new Game();
  game.newStart();
  opponent = new Opponent(game, game.player1Hand);
  playAudioWithDelay(card_lay_trump, 50);
  playAudioWithDelay(deck_shuffle, 1100);
  playAudioWithDelay(bell, 2550);
  updateGameUI();
}

function showCard(divID, cardID) {
  let CardDiv = document.getElementById(divID);
  CardDiv.innerHTML = "";
  const suit = document.createElement("div");
  suit.innerText = cardID.suit;
  suit.style.fontSize = "2rem";
  suit.style.userSelect = "none";
  suit.style.color = cardID.color();

  const rank = document.createElement("div");
  rank.innerText = cardID.rank;
  rank.style.fontSize = "1.5rem";
  rank.style.userSelect = "none";
  CardDiv.appendChild(suit);
  CardDiv.appendChild(rank);
}

function logState() {
  const logField = document.getElementById("textLog");
  let state = game.gameState;
  logField.innerHTML += `<br> <span> ${state} </span>`;
  if (game.gameState === gameStates.endGame) {
    alert(game.endGameText);
  }
}
