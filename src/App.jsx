import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { auth, db } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

export default function FlashcardsApp() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ front: '', back: '' });
  const [user, setUser] = useState(null);
  const [fontSize, setFontSize] = useState('text-2xl');

  const currentCard = cards[currentIndex];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'cards'));
        const fetchedCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCards(fetchedCards);
      } else {
        setUser(null);
        setCards([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign-in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const handleFlip = () => setFlipped(!flipped);

  const handleNext = () => {
    setFlipped(false);
    setCurrentIndex((currentIndex + 1) % cards.length);
  };

  const handlePrev = () => {
    setFlipped(false);
    setCurrentIndex((currentIndex - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!user || !formData.front || !formData.back) return;

    if (isEditing) {
      const updatedCard = { ...currentCard, ...formData };
      await updateDoc(doc(db, 'users', user.uid, 'cards', currentCard.id), updatedCard);
      const updatedCards = [...cards];
      updatedCards[currentIndex] = updatedCard;
      setCards(updatedCards);
    } else {
      const newCard = { front: formData.front, back: formData.back };
      const docRef = await addDoc(collection(db, 'users', user.uid, 'cards'), newCard);
      setCards([...cards, { id: docRef.id, ...newCard }]);
      setCurrentIndex(cards.length);
    }

    setShowForm(false);
    setIsEditing(false);
    setFormData({ front: '', back: '' });
  };

  const handleAddCard = () => {
    setFormData({ front: '', back: '' });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditCard = () => {
    setFormData({ front: currentCard.front, back: currentCard.back });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDeleteCard = async () => {
    if (window.confirm('Delete this card?') && user) {
      await deleteDoc(doc(db, 'users', user.uid, 'cards', currentCard.id));
      const updatedCards = cards.filter((_, index) => index !== currentIndex);
      setCards(updatedCards);
      setCurrentIndex(0);
      setFlipped(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <div className="mb-4 space-x-2">
        {user ? (
          <>
            <span className="text-sm">Signed in as {user.displayName || user.email}</span>
            <Button onClick={handleSignOut}>Sign Out</Button>
          </>
        ) : (
          <Button onClick={handleGoogleSignIn}>Sign In with Google</Button>
        )}
      </div>

      {user && (
        <>
          <div className="mb-4">
            <label className="mr-2 font-medium">Font Size:</label>
            <select
              className="p-2 border rounded"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
            >
              <option value="text-lg">Small</option>
              <option value="text-xl">Medium</option>
              <option value="text-2xl">Large</option>
              <option value="text-3xl">Extra Large</option>
              <option value="text-4xl">Extra Extra Large</option>
              <option value="text-5xl">Extra Extra Extra Large</option>
            </select>
          </div>

          {cards.length > 0 && (
            <>
              <div
                className={`bg-white p-10 ${fontSize} rounded-2xl shadow-lg cursor-pointer`}
                onClick={handleFlip}
              >
                <h2 className="font-bold">
                  {flipped ? currentCard.back : currentCard.front}
                </h2>
              </div>
              <div className="mt-4 space-x-2">
                <Button onClick={handlePrev}>Previous</Button>
                <Button onClick={handleNext}>Next</Button>
                <Button onClick={handleShuffle}>Shuffle</Button>
              </div>
            </>
          )}

          <div className="mt-4 space-x-2">
            <Button onClick={handleAddCard}>Add</Button>
            {cards.length > 0 && (
              <>
                <Button onClick={handleEditCard}>Edit</Button>
                <Button onClick={handleDeleteCard}>Delete</Button>
              </>
            )}
          </div>
        </>
      )}

      {user && showForm && (
        <form onSubmit={handleFormSubmit} className="mt-6 bg-gray-100 p-4 rounded">
          <div className="mb-2">
            <input
              type="text"
              placeholder="Front"
              value={formData.front}
              onChange={(e) => setFormData({ ...formData, front: e.target.value })}
              className="w-full p-2 rounded border text-lg"
              required
            />
          </div>
          <div className="mb-2">
            <input
              type="text"
              placeholder="Back"
              value={formData.back}
              onChange={(e) => setFormData({ ...formData, back: e.target.value })}
              className="w-full p-2 rounded border text-lg"
              required
            />
          </div>
          <div className="space-x-2">
            <Button type="submit">{isEditing ? 'Update' : 'Add'} Card</Button>
            <Button type="button" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {user && cards.length === 0 && <div>No cards available.</div>}
    </div>
  );
}
