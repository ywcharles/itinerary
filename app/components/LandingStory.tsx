"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./LandingStory.module.css";

const chapters = [
  { label: "A little intention", title: "Start with somewhere.", text: "The coffee spot you saved. That view you can’t miss. Give your places a time, and watch your day take shape.", detail: "Your map and your schedule, finally on the same page." },
  { label: "Better with your people", title: "Make it everyone’s trip.", text: "One link brings the whole crew into the plan. A lunch idea from one friend. A little detour from another. A day that feels like all of you.", detail: "Less back-and-forth. More looking forward." },
  { label: "Leave room for a little magic", title: "Find your in-between.", text: "A free hour doesn’t need to be an empty hour. Discover a little something nearby that fits the time you have.", detail: "A vision for thoughtful AI suggestions. Always your call." },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>;
}

function DayPreview({ chapter, selected, onSelect, added, onAdd }: { chapter: number; selected: number; onSelect: (n: number) => void; added: boolean; onAdd: () => void }) {
  const stops = ["Coffee, then everything", "A wander through town", "Lunch with a view"];
  return <div className={styles.dayPreview}>
    <div className={styles.previewTop}><div><span className={styles.micro}>YOUR LITTLE GETAWAY</span><h3>A day in the sun <span>☀</span></h3></div><div className={styles.avatars} aria-label="Three travel companions"><span>J</span><span>M</span><span>A</span></div></div>
    <div className={styles.previewTabs}><span>Saturday, September 19</span><span className={styles.demoLabel}>Interactive demo</span></div>
    <div className={styles.previewContent}>
      <div className={styles.agenda}>
        {stops.map((stop, index) => <div key={stop}>
          <button type="button" onClick={() => onSelect(index)} aria-pressed={selected === index} className={`${styles.stop} ${selected === index ? styles.selectedStop : ""}`}><span className={styles.stopTime}>{["09:00", "11:00", "12:30"][index]}</span><span className={styles.stopNumber}>{index + 1}</span><span><strong>{stop}</strong><small>{["A slow start · 60 min", "Explore · 90 min", "All together · 60 min"][index]}</small></span></button>
          {index === 0 && <div className={`${styles.freeTime} ${chapter === 2 ? styles.activeGap : ""}`}><span aria-hidden="true">✧</span><span>{added ? "10:00 · A garden detour added" : "10:00 — A little room to explore"}</span></div>}
        </div>)}
      </div>
      <div className={styles.routeIllustration} aria-label={`Illustrative route. Selected stop: ${stops[selected]}`}>
        <div className={styles.park}/><div className={styles.river}/><div className={styles.streetOne}/><div className={styles.streetTwo}/><div className={styles.streetThree}/>
        <svg viewBox="0 0 300 290" preserveAspectRatio="none" className={styles.routeLine} aria-hidden="true"><path d="M64 190 L64 120 Q64 90 95 90 L196 90 L196 207 L244 207" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5 6" /></svg>
        {stops.map((stop, index) => <button key={stop} type="button" className={`${styles.mapPin} ${styles[`pin${index}`]} ${selected === index ? styles.activePin : ""}`} onClick={() => onSelect(index)} aria-label={`Show stop ${index + 1}: ${stop}`} aria-pressed={selected === index}>{index + 1}</button>)}
        <span className={styles.mapCaption}>A little route. A lovely day.</span><span className={styles.mapDisclaimer}>Illustrative map</span>
      </div>
    </div>
    <div className={styles.previewFooter} aria-live="polite">{chapter === 0 ? "Select a stop. Find it on the map." : chapter === 1 ? "Maya’s lunch idea, now part of the plan." : added ? "Garden detour added to this demo day." : "45 minutes free. Something lovely nearby."}</div>
    {chapter === 1 && <div className={styles.floatingMessage}><span className={styles.friendAvatar}>M</span><div><strong>Maya has an idea</strong><p>“Lunch here? Look at that view.”</p></div><span aria-hidden="true">♡</span></div>}
    {chapter === 2 && <div className={styles.floatingSuggestion}><span className={styles.suggestionIcon}>✧</span><div><span className={styles.micro}>A LITTLE DISCOVERY</span><strong>A quiet garden around the corner</strong><small>5 min away · Fits your 45-minute gap</small></div><button onClick={onAdd} disabled={added} type="button">{added ? "Added ✓" : "Add to demo +"}</button></div>}
  </div>;
}

export default function LandingStory() {
  const [chapter, setChapter] = useState(0);
  const [selected, setSelected] = useState(0);
  const [added, setAdded] = useState(false);
  const story = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setChapter(Number((visible.target as HTMLElement).dataset.chapter));
    }, { rootMargin: "-25% 0px -35% 0px", threshold: [0, .2, .5] });
    story.current?.querySelectorAll("[data-chapter]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return <main className={styles.landing} id="main-content">
    <section className={styles.hero}>
      <div className={styles.heroCopy}><div className={styles.eyebrow}><span/> THE GOOD PART STARTS HERE</div><h1>A little planning.<br/>A lot of <em>possibility.</em></h1><p>Your places, your people, your next great day.<br className={styles.desktopBreak}/> Bring it all together on one shared itinerary.</p><div className={styles.heroActions}><Link href="/itinerary" className={styles.primaryButton}>Create your itinerary <Arrow diagonal/></Link><a href="#the-story" className={styles.textLink}>See how a day unfolds <span aria-hidden="true">↓</span></a></div><div className={styles.heroNote}><span className={styles.smallAvatars}><i>J</i><i>M</i><i>A</i></span><span>For the places you’ll go. And the people you’ll go with.</span></div></div>
      <div className={styles.heroArt}>
        <Image src="/images/coastal-day.png" alt="An illustrated coastal village, with a winding path through green hills to a blue bay" fill sizes="(max-width: 760px) 100vw, 55vw" priority className={styles.heroImage}/>
        <div className={styles.postcardLabel}><span>NOT ALL THE BEST MOMENTS ARE PLANNED.</span><span>✧</span></div>
        <div className={styles.heroStop}><span className={styles.heroStopNumber}>1</span><div><small>09:00 · START SLOW</small><strong>Coffee with a view</strong></div><span aria-hidden="true">↗</span></div>
        <div className={styles.heroStamp}>A GOOD DAY<br/><span>TO GET LOST</span><br/>↗</div>
      </div>
      <div className={styles.heroBottom}><span>LESS LOGISTICS. MORE LIVING.</span><a href="#the-story" aria-label="Scroll to the story">↓</a><span>YOUR NEXT CHAPTER, BELOW</span></div>
    </section>
    <section className={styles.intro} id="about"><span className={styles.micro}>SOMEWHERE BETWEEN A MAP AND A MEMORY</span><h2>Great trips don’t need<br/>a hundred open tabs.</h2><p>Just a few good places, the right people,<br/>and a plan with room to breathe.</p></section>
    <section className={styles.story} id="the-story" ref={story} aria-label="How your itinerary comes together">
      <div className={styles.chapters}>{chapters.map((item, index) => <article key={item.title} data-chapter={index} className={`${styles.chapter} ${chapter === index ? styles.currentChapter : ""}`}><span className={styles.chapterNumber}>0{index + 1}<span/></span><div className={styles.eyebrow}>{item.label}</div><h2>{item.title}</h2><p>{item.text}</p><div className={styles.chapterDetail}>{item.detail}</div></article>)}</div>
      <div className={styles.stickyPreview}><div className={styles.chapterProgress} aria-label={`Chapter ${chapter + 1} of 3`}>{chapters.map((item, i) => <span key={item.title} className={chapter === i ? styles.progressActive : ""}/>)}</div><DayPreview chapter={chapter} selected={selected} onSelect={setSelected} added={added} onAdd={() => setAdded(true)}/><span className={styles.previewHint}>A sample day, coming together as you scroll.</span></div>
    </section>
    <section className={styles.closing}><span className={styles.micro}>THE PLAN IS JUST THE BEGINNING</span><h2>Go make a day<br/>you’ll <em>talk about.</em></h2><p>The little detours. The long lunches. The “remember when.”<br/>It all starts with a place to put your plans.</p><Link href="/itinerary" className={styles.primaryButton}>Let’s plan something <Arrow diagonal/></Link><div className={styles.closingRoute} aria-hidden="true"><span>○</span><i/><span>✧</span><i/><span>↗</span></div></section>
    <section className={styles.faq} id="questions"><div><span className={styles.micro}>BEFORE YOU SET OFF</span><h2>A few little details.</h2></div><div className={styles.questions}><details><summary>How do I start an itinerary?<span>+</span></summary><p>Give your trip a name to create its own link. Then add places and time slots to begin shaping your day.</p></details><details><summary>Can I share it with my travel companions?<span>+</span></summary><p>Yes. Send them the itinerary link so they can open the same plan. Treat it like a shared document: anyone with the link can access it.</p></details><details><summary>Do I have to plan every minute?<span>+</span></summary><p>Not at all. Add the things you don’t want to miss and leave the rest open. A good itinerary makes space for spontaneity.</p></details><details><summary>How do the AI suggestions work?<span>+</span></summary><p>The landing-page demo shows the idea: nearby discoveries that fit between your activities. Live AI recommendations are still in development.</p></details></div></section>
    <footer className={styles.footer}><Link href="/" className={styles.footerBrand}>itin<span>erary</span><Arrow diagonal/></Link><p>A little structure. A lot of possibility.</p><a href="#main-content">Back to the beginning ↑</a></footer>
  </main>;
}
