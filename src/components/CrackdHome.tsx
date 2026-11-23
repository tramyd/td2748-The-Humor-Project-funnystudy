"use client";

import Link from "next/link";
import {
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

type CrackdCard = {
  id: number;
  username: string;
  score: number;
  text: string;
  image: string;
  studyId?: number;
};

const cards: CrackdCard[] = [
  {
    id: 1,
    username: "Crackd",
    score: 78,
    text: "chemists had 200 years to figure this shit out and somehow i'm the dumbass for not getting it in 90 minutes",
    image: "https://images.unsplash.com/photo-1606007175179-5d3f9a2a2b7c?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    username: "Crackd",
    score: 76,
    text: "instructor managed??? brother you are the instructor please manage to let me in",
    image: "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    username: "Crackd",
    score: 68,
    text: "fighting for my life to get into a class i'm planning to skip",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    username: "Crackd",
    score: 67,
    text: "how do you forget to put the register button on the registration website",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
  },
];

export function CrackdHome({
  studyId,
}: {
  studyId?: number;
}) {
  const [period, setPeriod] = useState("Past Week");
  const [showCount, setShowCount] = useState("8");
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  return (
    <div id="crackd-home" className="crackd-home">
      <header className="crackd-header">
        <div className="crackd-header-inner">
          <Link href="/" aria-label="Crackd home" className="crackd-logo">
            <span>CRA</span>
            <span className="crackd-logo-mark" aria-hidden>
              <span className="crackd-logo-smile" />
            </span>
            <span>CKD</span>
          </Link>
          <nav className="crackd-auth" aria-label="Account">
            <Link href="/login" className="crackd-login">Login</Link>
            <Link href="/login" className="crackd-signup">Sign up</Link>
          </nav>
        </div>
      </header>

      <main className="crackd-main">
        <div className="crackd-toolbar">
          <div className="crackd-periods" aria-label="Ranking period">
            {["Past Week", "Past Month", "Past Year", "All Time"].map((item) => (
              <button
                key={item}
                type="button"
                className={period === item ? "active" : ""}
                onClick={() => setPeriod(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="crackd-show">
            <span>Show</span>
            <label>
              <span className="sr-only">Number of captions</span>
              <select value={showCount} onChange={(event) => setShowCount(event.target.value)}>
                <option>8</option>
                <option>16</option>
                <option>24</option>
              </select>
            </label>
            <span>at a time</span>
          </div>
        </div>

        <section className="crackd-grid" aria-label="Top captions">
          {cards.map((card) => {
            const href = studyId ? `/study/${studyId}` : "/";
            return (
              <article className="crackd-card" key={card.id}>
                <div className="crackd-card-top">
                  <div className="crackd-author">
                    <span className="crackd-badge" aria-hidden />
                    <span>{card.username}</span>
                  </div>
                  <div className="crackd-votes" aria-label={`${card.score} votes`}>
                    <span>{card.score}</span>
                    <ChevronUpIcon aria-hidden />
                    <ChevronDownIcon aria-hidden />
                  </div>
                </div>
                <Link href={href} prefetch={false} className="crackd-copy">
                  {card.text}
                </Link>
                <Link href={href} prefetch={false} className="crackd-image-link" aria-label="Open caption">
                  <img src={card.image} alt="" className="crackd-image" />
                </Link>
                <div className="crackd-card-actions">
                  <button
                    type="button"
                    aria-label={saved[card.id] ? "Remove saved caption" : "Save caption"}
                    onClick={() => setSaved((current) => ({ ...current, [card.id]: !current[card.id] }))}
                  >
                    {saved[card.id] ? (
                      <BookmarkSolidIcon aria-hidden />
                    ) : (
                      <BookmarkIcon aria-hidden />
                    )}
                  </button>
                  <button type="button" aria-label="Share caption">
                    <ShareIcon aria-hidden />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <Link href={studyId ? `/study/${studyId}` : "/"} prefetch={false} className="crackd-generate">
        Generate Captions
      </Link>
    </div>
  );
}
