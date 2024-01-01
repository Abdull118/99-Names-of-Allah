import React, { useState, useEffect } from 'react';
import './App.css'
import islamDecor from './images/islamDecor.png'
import islamDecor2 from './images/islamDecor2.png'
import { useWindowWidth } from './components/functions/useWindowWidth'

const apiUrl = 'https://api.aladhan.com/v1/asmaAlHusna';


const fetchData = async () => {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    return data.data; // Ensure this matches the structure of your API response
  } catch (error) {
    console.error('Error fetching data: ', error);
    return [];
  }
};

const sm2 = (quality, { repetitions, interval, easiness }) => {
  // Adjusting intervals based on the quality of recall
  if (quality === 0 || quality === 1) {  // Complete blackout or incorrect answer
    repetitions = 0;
    interval = 1;  // Immediate repetition
  } else if (quality === 2) {  // Correct answer with difficulty
    repetitions = 0;
    interval = 3;  // Slightly longer delay for slightly better recall
  } else {
    // Quality is 3 or above (correct answer with varying degrees of ease)
    if (repetitions === 0) interval = 10;  // First successful recall, slightly extended initial interval
    else if (repetitions === 1) interval = 30;  // Second successful recall, further extended interval
    else interval = Math.ceil(interval * easiness * 60);  // Subsequent recalls use the modified interval
    repetitions += 1;
    easiness = Math.max(1.3, easiness + 0.1 * (quality - 2.5));  // Adjusting the easiness factor
  }

  return { repetitions, interval, easiness };
};

const getNextReviewTime = (interval) => {
  const now = new Date();
  return new Date(now.getTime() + interval * 60000);  // Converts interval from minutes to milliseconds
};

const Flashcard = ({ name, transliteration, en, cardData, updateCard }) => {
  const [flipped, setFlipped] = useState(false);

  const handleUserGrade = (grade) => {
    updateCard(grade);
    setFlipped(false);
  };

  

  return (
    <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
      {!flipped && (
        <div className="front">
          <p>{name}</p>
          <p>{transliteration}</p>
          <button onClick={() => setFlipped(true)}>Show Answer</button>
        </div>
      )}
      {flipped && (
        <div className="back">
          <p>{en.meaning}</p>
          <button onClick={() => handleUserGrade(1)} className='veryHard'>Very Hard</button>
          <button onClick={() => handleUserGrade(2)} className='hard'>Hard</button>
          <button onClick={() => handleUserGrade(3)} className='good'>Good</button>
          <button onClick={() => handleUserGrade(5)} className='easy'>Easy</button> 
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(null);  // Initialize as null

  useEffect(() => {
    const storedData = getFromLocalStorage('flashcards');
    if (!storedData || storedData.length === 0) {
      fetchData().then(data => {
        const preparedData = data.map((item, index) => ({
          ...item,
          cardData: { repetitions: 0, interval: 1, easiness: 2.5 },
          nextReview: new Date()
        }));
        setCards(preparedData);
        saveToLocalStorage('flashcards', preparedData);
        setCurrentCardIndex(findNextDueCardIndex(preparedData));  // Set the index of the first due card
      });
    } else {
      setCards(storedData);
      setCurrentCardIndex(findNextDueCardIndex(storedData));  // Set the index of the first due card
    }
  }, []);

  const findNextDueCardIndex = (cardsArray) => {
    const now = new Date();
    let nextDueIndex = cardsArray.findIndex(card => new Date(card.nextReview) <= now);
    return nextDueIndex !== -1 ? nextDueIndex : null;  // Return null if no cards are due
  };

  const updateCard = (quality) => {
    if(currentCardIndex === null) return;  // If no current card, exit the function

    const card = cards[currentCardIndex];
    const updatedCardData = sm2(quality, card.cardData);
    const nextReview = getNextReviewTime(updatedCardData.interval);
    const updatedCard = { ...card, cardData: updatedCardData, nextReview };

    const newCards = [...cards.slice(0, currentCardIndex), updatedCard, ...cards.slice(currentCardIndex + 1)];
    setCards(newCards);
    saveToLocalStorage('flashcards', newCards);

    setCurrentCardIndex(findNextDueCardIndex(newCards));  // Update to the next due card
  };

  const saveToLocalStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const getFromLocalStorage = (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  };

  const currentCard = (currentCardIndex !== null && cards.length > 0) ? cards[currentCardIndex] : null;
  const windowWidth = useWindowWidth();
  return (
    <div className="app">
      <div className='headerContainer'>
      <div className='header'>The 99 Name's of Allah (SWT)</div>
      <div className='description'>A flashcard program designed to help memorize the 99 Name's of Allah</div>
      </div>
      {currentCard ? (
        <Flashcard
          {...currentCard}
          updateCard={updateCard}
        />
      ) : (
        <p>Loading cards or no cards available...</p>
      )}
      {windowWidth < 600 ? <img src={islamDecor} className='footerImg'/>
      : 
      <img src={islamDecor2} className='footerImg2'/>
      }
      
    </div>
  );
};

export default App;
