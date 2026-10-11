/* FORGE quote library: real athletes, coaches and fighters, grouped by person.
   Lists of "famous quotes" online are full of misattributions, so every line carries a provenance tier:
     s  SOURCED     traced to a dated, identifiable origin (an ad, a speech, a news story, a film script, a book title)
     r  REPORTED    credible secondary source (a magazine, a biography, a recognised quote-checker); original not seen
     a  ATTRIBUTED  widely credited to them, but no original source was found - treat the wording as approximate
   Each row is [text, tier, source note, tags]. An empty source note means "no origin found" and the app fills in a
   standard line. Tags say when the line fits: g general, l lift day, f fight day, c craft/build day, k streak at risk,
   b comeback, p new record, m milestone, d deload week, w first week, h 90-day challenge, x fight camp.
   Found a better source, or a line that is wrong? Fix the row here; the app reads this file at start-up. */
const QCATS = {fight:'Fighters',mart:'Martial arts',lift:'Lifters',run:'Runners & riders',team:'Team sports',solo:'Solo sports',coach:'Coaches',mind:'Operators & explorers'};
const QLIB = [
["Greg Plitt","lift","Fitness model, Army Ranger veteran",[
 ["There are two types of pain: pain that hurts you and pain that changes you.","s","His YouTube video and Facebook post, Oct 4, 2011 (traced by Barry Popik)","glbw"],
 ["Normality is what weak people call living. I call it death.","r","Quoted in an Iron Man Magazine tribute (\"Greg used to say\"); original video not confirmed","gkb"],
 ["I love the mentality that when push comes to shove, simply work harder and the results will come.","a","Circulates in fan collections; no original source found","glk"],
 ["Today begins, tomorrow continues, and it never ends until you reach your goal.","a","Circulates in fan collections; no original source found","hwg"]]],

["Muhammad Ali","fight","Heavyweight champion",[
 ["I hated every minute of it. But I said to myself, \"Suffer now, and live the rest of your life as a champion.\"","s","On training for the 1978 Leon Spinks rematch, as reported in September 1978","gbflx"],
 ["I am the greatest! I shook up the world!","s","Ringside after beating Sonny Liston, Feb 25, 1964 (on film)","gmp"],
 ["Archie Moore must fall in four.","r","His rhyme predicting the result of the Nov 1962 Archie Moore fight; he won in round four","fx"],
 ["Float like a butterfly, sting like a bee.","r","His 1960s chant, worked up with his corner man Drew \"Bundini\" Brown","fx"],
 ["I don't count my sit-ups. I only start counting when it starts hurting, because they're the only ones that count.","a","Widely printed (ESPN lists it among his best); no original interview found, wording varies","lpg"],
 ["The fight is won or lost far away from witnesses, behind the lines, in the gym, and out there on the road, long before I dance under those lights.","a","Widely credited to Ali; no original source found","fxl"],
 ["Champions aren't made in gyms. Champions are made from something they have deep inside them: a desire, a dream, a vision.","a","","gfh"],
 ["It isn't the mountains ahead to climb that wear you out; it's the pebble in your shoe.","a","","gk"],
 ["Inside of a ring or out, ain't nothing wrong with going down. It's staying down that's wrong.","a","","bf"],
 ["It's lack of faith that makes people afraid of meeting challenges, and I believed in myself.","a","","gh"],
 ["Service to others is the rent you pay for your room here on earth.","a","","gm"],
 ["I done wrestled with an alligator, I done tussled with a whale; handcuffed lightning, thrown thunder in jail.","r","His pre-fight rhyme before the Foreman fight in Zaire, 1974 (on film in When We Were Kings)","fx"]]],

["Mike Tyson","fight","Heavyweight champion",[
 ["Everybody has plans until they get hit for the first time.","s","Associated Press, August 1987, ahead of the Tyrell Biggs fight (traced by Quote Investigator)","fxg"],
 ["Discipline is doing what you hate to do, but nonetheless doing it like you love it.","a","","gkl"]]],

["Cus D'Amato","coach","Trainer of Floyd Patterson and Mike Tyson",[
 ["The only difference between a hero and a coward is what they do with the fear: the hero uses it, the coward runs from it.","a","Widely credited to Cus, retold by Tyson; the wording varies between tellings","fx"],
 ["Fear is like fire. If you can control it, it will cook for you. If you can't, it will burn your house down.","a","","fxb"]]],

["Joe Louis","fight","Heavyweight champion 1937-49",[
 ["He can run, but he can't hide.","s","Coshocton Tribune, 9 June 1946, before the Billy Conn rematch (via Wikiquote)","fx"]]],

["Joe Frazier","fight","Heavyweight champion",[
 ["You can map out a fight plan or a life plan, but when the action starts, it may not go the way you planned, and you're down to what you're made of, which is training and discipline.","a","","fxl"]]],

["Marvin Hagler","fight","Undisputed middleweight champion",[
 ["It's tough to get up and do roadwork at five in the morning when you've been used to sleeping in silk pajamas.","a","Widely credited to Hagler; the exact interview wasn't found","xlg"]]],

["George Foreman","fight","Two-time heavyweight champion",[
 ["Boxing is the sport to which all other sports aspire.","a","","fc"]]],

["Manny Pacquiao","fight","Eight-division world champion",[
 ["Don't dream of winning, train for it.","a","","gxl"]]],

["Jack Dempsey","fight","Heavyweight champion 1919-26",[
 ["A champion is someone who gets up when he can't.","a","","bf"]]],

["James J. Corbett","fight","Heavyweight champion 1892-97",[
 ["You become a champion by fighting one more round. When things are tough, you fight one more round.","a","Widely credited to Gentleman Jim; no original source found","bfk"]]],

["Floyd Patterson","fight","Two-time heavyweight champion",[
 ["It's easy to do anything in victory. It's in defeat that a man reveals himself.","a","","bg"]]],

["Conor McGregor","fight","UFC two-division champion",[
 ["We're not here to take part, we're here to take over.","s","In the cage after beating Diego Brandao, UFC Fight Night Dublin, July 2014","gmfx"],
 ["I'm not talented, I'm obsessed.","a","Widely credited to him; no original source found","gl"],
 ["Hard work. Dedication.","r","Mayweather's catchphrase, from the HBO 24/7 series and his interviews","lx"]]],

["Georges St-Pierre","fight","UFC welterweight and middleweight champion",[
 ["Fear is the genesis of most of the good things that have occurred in my life.","a","From The Way of the Fight (2013), as transcribed by a reader; page not checked","fxb"]]],

["John Danaher","mart","Jiu-jitsu coach",[
 ["Position before submission.","r","The core rule of his teaching, repeated across his instructionals and interviews","fcx"]]],

["Bruce Lee","mart","Martial artist, founder of Jeet Kune Do",[
 ["I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.","r","Confirmed authentic by the Bruce Lee Foundation (per Snopes); the original source has not been published","fcxg"],
 ["Be water, my friend.","s","Said as the character Li Tsung in Longstreet, \"The Way of the Intercepting Fist\" (1971), a line Lee co-wrote with Stirling Silliphant","gcbw"],
 ["Boards don't hit back.","s","Enter the Dragon (1973), Lee's character to the man who mocks his training","fcxg"],
 ["The successful warrior is the average man, with laser-like focus.","a","","gcl"],
 ["Use only that which works, and take it from any place.","r","His Jeet Kune Do philosophy; in Tao of Jeet Kune Do (1975)","cg"],
 ["Don't think. Feel. It is like a finger pointing away to the moon. Do not concentrate on the finger or you will miss all that heavenly glory.","s","Enter the Dragon (1973), Lee's character teaching a student","fcx"],
 ["Absorb what is useful, discard what is useless, and add what is specifically your own.","r","His Jeet Kune Do philosophy; in Tao of Jeet Kune Do (1975)","cg"],
 ["If you spend too much time thinking about a thing, you'll never get it done.","a","","gkw"],
 ["A goal is not always meant to be reached; it often serves simply as something to aim at.","a","","gh"],
 ["Mistakes are always forgivable, if one has the courage to admit them.","a","","bg"]]],

["Gichin Funakoshi","mart","Founder of modern Shotokan karate",[
 ["The ultimate aim of karate lies not in victory or defeat, but in the perfection of the character of its participants.","r","His Twenty Guiding Principles of Karate (Niju Kun), as translated in his books","cg"],
 ["Do not think that you have to win; think rather that you do not have to lose.","r","From the Niju Kun, as translated","fx"]]],

["Jigoro Kano","mart","Founder of judo",[
 ["It is not important to be better than someone else, but to be better than yesterday.","a","Widely credited to Kano; no original source found","gkh"],
 ["Maximum efficiency, minimum effort.","r","Seiryoku zen'yo, one of the two guiding principles he set for judo","fc"]]],

["Miyamoto Musashi","mart","Undefeated swordsman, author of The Book of Five Rings",[
 ["The Way is in training.","r","The Book of Five Rings (1645), as translated","lcg"],
 ["Do nothing which is of no use.","r","The Dokkodo, the 21 precepts he wrote days before he died (1645), as translated","gc"],
 ["Today is victory over yourself of yesterday; tomorrow is your victory over lesser men.","a","Widely credited to Musashi; translation and source vary","gkh"],
 ["Think lightly of yourself and deeply of the world.","r","The Dokkodo, as translated","gd"],
 ["A thousand days of training to forge, ten thousand days of training to polish.","a","Widely credited to Musashi (the Book of Five Rings); translations differ","lch"]]],

["Morihei Ueshiba","mart","Founder of aikido",[
 ["True victory is victory over oneself.","r","His aikido motto, masakatsu agatsu","gkh"],
 ["Failure is the key to success; each mistake teaches us something.","a","","bg"]]],

["Arnold Schwarzenegger","lift","Seven-time Mr. Olympia",[
 ["The last three or four reps is what makes the muscle grow.","a","Widely credited to Pumping Iron (1977); the exact scene is not confirmed","lp"],
 ["The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it, as long as you really believe 100 percent.","a","Widely credited to him; no original source found","glh"],
 ["The resistance that you fight physically in the gym and the resistance that you fight in life can only build a strong character.","a","","lgk"],
 ["Strength does not come from winning. Your struggles develop your strengths. When you go through hardships and decide not to surrender, that is strength.","a","","bg"],
 ["For me, life is continuously being hungry. The meaning of life is not simply to exist, to survive, but to move ahead, to go up, to achieve, to conquer.","a","","gmh"],
 ["The worst thing I can be is the same as everybody else. I hate that.","a","","gkl"]]],

["Ronnie Coleman","lift","Eight-time Mr. Olympia",[
 ["Everybody wants to be a bodybuilder, but don't nobody want to lift no heavy-ass weight.","r","His training video The Unbelievable (2000), after a heavy T-bar row set (per an Iron Man review)","lpk"],
 ["Ain't nothin' but a peanut!","a","","lp"],
 ["Light weight, baby!","a","Coleman's shout in his training videos","lp"]]],

["Lee Haney","lift","Eight-time Mr. Olympia",[
 ["Stimulate, don't annihilate.","r","His training principle for Mr. Olympia years (1984-91), repeated in interviews","ldk"]]],

["Jack LaLanne","lift","Fitness pioneer",[
 ["Exercise is king. Nutrition is queen. Put them together and you've got a kingdom.","r","His long-running TV catchphrase","lgc"],
 ["I can't die, it would ruin my image.","a","Widely credited to him in his 90s; no original interview found","gk"],
 ["Dying is easy. Living is a pain in the butt. It's like an athletic event. You've got to train for it.","a","","gk"]]],

["Mark Rippetoe","lift","Author of Starting Strength",[
 ["Strong people are harder to kill than weak people, and more useful in general.","s","Starting Strength (his barbell training book)","lg"]]],

["Dan John","lift","Strength coach and Highland Games thrower",[
 ["If something is important, do it every day. If something is not important, don't do it at all.","a","Widely credited to him in his writing; exact piece not confirmed","gkcl"],
 ["The goal is to keep the goal the goal.","r","His coaching line, used throughout his books and articles","gkh"]]],

["Pavel Tsatsouline","lift","Strength coach, kettlebell pioneer",[
 ["Strength is a skill.","r","The central idea of Power to the People! (2000)","lc"]]],

["Jim Wendler","lift","Powerlifter, creator of 5/3/1",[
 ["Start too light. Progress slowly.","r","The foundation of his 5/3/1 method","wdl"]]],

["Eliud Kipchoge","run","Marathon world-record holder; first to run 26.2 miles under two hours",[
 ["No human is limited.","r","His line after running 1:59:40 in Vienna on Oct 12, 2019 (wording varies slightly between reports)","mpgh"],
 ["Only the disciplined ones in life are free.","a","Widely credited to him in interviews; exact source not found","gkb"]]],

["Steve Prefontaine","run","Oregon distance runner, US record holder",[
 ["To give anything less than your best is to sacrifice the gift.","a","Widely credited; sources disagree on the exact words (gift, talent)","gl"],
 ["A lot of people run a race to see who's the fastest. I run a race to see who has the most guts.","a","","fhg"],
 ["Somebody may beat me, but they are going to have to bleed to do it.","a","","fxg"]]],

["Emil Zatopek","run","Olympic champion 1952: 5,000m, 10,000m and marathon",[
 ["Why should I practice running slowly? I already know how to run slowly. I want to learn to run fast.","a","Widely credited to him; no original interview found","lcg"],
 ["If you want to run, run a mile. If you want to experience a different life, run a marathon.","a","","hmg"]]],

["Roger Bannister","run","First man to run a sub-four-minute mile (May 6, 1954)",[
 ["The man who can drive himself further once the effort gets painful is the man who will win.","a","","pgf"]]],

["Paavo Nurmi","run","Nine Olympic golds for Finland",[
 ["Mind is everything. Muscle, pieces of rubber. All that I am, I am because of my mind.","a","","gkh"]]],

["Jesse Owens","run","Four golds at the 1936 Berlin Olympics",[
 ["We all have dreams. In order to make dreams come into reality, it takes an awful lot of determination, dedication, self-discipline, and effort.","a","Widely credited to Owens; no original source found","gwh"],
 ["The battles that count aren't the ones for gold medals. The struggles within yourself, the invisible, inevitable battles inside all of us, that's where it's at.","a","","gkb"]]],

["Wilma Rudolph","run","Three golds at the 1960 Rome Olympics",[
 ["My doctors told me I would never walk again. My mother told me I would. I believed my mother.","a","Widely credited to her; no original source found","bgh"],
 ["Winning is great, sure, but if you are really going to do something in life, the secret is learning how to lose.","a","","bd"]]],

["Usain Bolt","run","100m and 200m world-record holder",[
 ["I don't think limits.","r","Said in interviews around the 2008 Beijing Olympics; widely reported","gm"],
 ["Worrying gets you nowhere. If you turn up to a race and you're in shape, you have nothing to worry about.","a","","fx"]]],

["Kathrine Switzer","run","First woman to run Boston as a registered entrant (1967)",[
 ["If you are losing faith in human nature, go out and watch a marathon.","a","Widely credited to Switzer; no original source found","gm"]]],

["Dean Karnazes","run","Ultramarathon runner",[
 ["Run when you can, walk if you have to, crawl if you must; just never give up.","a","Widely credited to him; no original source found","bkh"]]],

["Haruki Murakami","run","Novelist and marathoner",[
 ["Pain is inevitable. Suffering is optional.","s","What I Talk About When I Talk About Running (2007), his running memoir","kgd"]]],

["Scott Jurek","run","Seven-time Western States 100 winner",[
 ["Sometimes you just do things.","r","His answer to why he runs, in his memoir Eat & Run (2012)","gkw"]]],

["Diana Nyad","run","Open-water swimmer",[
 ["We should never, ever give up. You are never too old to chase your dreams. It looks like a solitary sport, but it takes a team.","s","On Smathers Beach, Key West, after swimming from Cuba to Florida, Sept 2, 2013","mhgb"]]],

["Eddy Merckx","run","Five-time Tour de France winner",[
 ["Ride lots.","r","His famous answer when asked for his training advice","lkg"]]],

["Greg LeMond","run","Three-time Tour de France winner",[
 ["It never gets easier, you just go faster.","a","Widely credited to LeMond (he won the 1989 Tour by eight seconds); no original source found","pgk"]]],

["Arthur Lydiard","coach","New Zealand running coach",[
 ["Train, don't strain.","r","His best-known coaching maxim, widely cited","dlg"]]],

["Michael Phelps","solo","23 Olympic gold medals",[
 ["If you want to be the best, you have to do things that other people aren't willing to do.","a","Widely credited to him; no original interview found","glk"],
 ["You can't put a limit on anything. The more you dream, the farther you get.","a","","gh"]]],

["Simone Biles","solo","Most decorated gymnast in history",[
 ["I have to focus on my mental health and not jeopardize my health and well-being.","r","Press conference after withdrawing from the Tokyo Olympics team final, July 27, 2021","dbg"],
 ["I'd rather regret the risks that didn't work out than the chances I didn't take at all.","a","","gb"]]],

["Serena Williams","solo","23 Grand Slam singles titles",[
 ["Luck has nothing to do with it, because I have spent many, many hours, countless hours, on the court working for my one moment in time, not knowing when it would come.","a","Widely credited to her; the interview isn't identified","glm"],
 ["I really think a champion is defined not by their wins but by how they can recover when they fall.","a","","bg"]]],

["Roger Federer","solo","20 Grand Slam singles titles",[
 ["Effortless is a myth.","r","His 2024 Dartmouth commencement address (June 9, 2024), on people calling his game effortless","lcg"]]],

["Arthur Ashe","solo","Wimbledon, US Open and Australian Open champion",[
 ["Start where you are. Use what you have. Do what you can.","a","Widely credited to Ashe; no original source found","wgk"],
 ["True heroism is remarkably sober, very undramatic. It is not the urge to surpass all others at whatever cost, but the urge to serve others at whatever cost.","a","Credited to Ashe's writing; exact work not confirmed","g"]]],

["Billie Jean King","solo","39 Grand Slam titles; beat Bobby Riggs in 1973",[
 ["Pressure is a privilege.","s","Title of her 2008 book, Pressure Is a Privilege: Lessons I've Learned from Life and the Battle of the Sexes","gfx"],
 ["Champions keep playing until they get it right.","a","","bg"]]],

["Martina Navratilova","solo","18 Grand Slam singles titles",[
 ["The difference between involvement and commitment is like an eggs-and-ham breakfast: the chicken was involved; the pig was committed.","a","Widely credited to her; the saying is older than her use of it","gk"]]],

["Jimmy Connors","solo","Eight Grand Slam singles titles",[
 ["I hate to lose more than I love to win.","a","","gb"]]],

["Tiger Woods","solo","15 major championships",[
 ["No matter how good you get, you can always get better, and that's the exciting part.","a","Widely credited to him; the interview isn't identified","lcp"]]],

["Ben Hogan","solo","Nine major championships; came back from a 1949 car crash",[
 ["Every day that I don't practice is one day longer it takes to be good.","a","","lck"],
 ["The most important shot in golf is the next one.","a","","bg"]]],

["Gary Player","solo","Nine major championships",[
 ["The harder I practice, the luckier I get.","a","Widely credited to Player (also claimed by others); no original source found","lgc"]]],

["Ayrton Senna","solo","Three-time Formula One world champion",[
 ["If you no longer go for a gap that exists, you are no longer a racing driver.","a","Widely credited to Senna; no original interview found","fgx"],
 ["I have no idols. I admire work, dedication and competence.","a","","gcl"],
 ["I am not designed to come second or third. I am designed to win.","a","","fhx"]]],

["Mario Andretti","solo","Formula One and IndyCar champion",[
 ["If everything seems under control, you're just not going fast enough.","a","","gp"]]],

["Babe Didrikson Zaharias","solo","Olympic gold medallist and golf champion",[
 ["The formula for success is simple: practice and concentration, then more practice and more concentration.","a","","lcg"]]],

["Althea Gibson","solo","First Black player to win a Grand Slam (1956)",[
 ["No matter what accomplishments you make, somebody helped you.","a","","gm"]]],

["Michael Jordan","team","Six NBA championships",[
 ["I've missed more than 9,000 shots in my career. I've lost almost 300 games. [...] I've failed over and over and over again in my life. And that is why I succeed.","s","Nike \"Failure\" commercial, 1997","bgpm"],
 ["I can't accept not trying.","s","Title of his 1994 book, I Can't Accept Not Trying: Michael Jordan on the Pursuit of Excellence","bgwk"],
 ["Talent wins games, but teamwork and intelligence win championships.","r","Credited to the same 1994 book","gc"],
 ["Some people want it to happen, some wish it would happen, others make it happen.","a","","gkh"],
 ["Obstacles don't have to stop you. If you run into a wall, don't turn around and give up. Figure out how to climb it, go through it, or work around it.","a","","bgh"],
 ["I've never lost a game; I just ran out of time.","a","","bg"],
 ["Never say never, because limits, like fears, are often just an illusion.","a","","gh"]]],

["Kobe Bryant","team","Five NBA championships",[
 ["Rest at the end, not in the middle.","r","Reported as a line he lived by after retiring; original venue not confirmed","gxkh"],
 ["Job's not finished.","r","His reply to reporters when the Lakers went 2-0 up on Orlando in the 2009 NBA Finals","pmgx"],
 ["I fell in love with you.","s","\"Dear Basketball,\" his farewell poem, The Players' Tribune, Nov 29, 2015","gc"],
 ["Mamba out.","s","Closing his last game speech, April 13, 2016","mg"],
 ["Everything negative, pressure, challenges, is all an opportunity for me to rise.","a","Widely credited to him; no original interview found","bgf"],
 ["I have nothing in common with lazy people who blame others for their lack of success. Great things come from hard work and perseverance. No excuses.","a","","gkl"],
 ["If you're afraid to fail, then you're probably going to fail.","a","","bgf"]]],

["LeBron James","team","Four NBA championships; all-time leading scorer",[
 ["I'm LeBron James from Akron, Ohio, from the inner city. I am not supposed to be here.","a","Widely quoted from a post-game interview during the 2016 title run; the exact moment isn't confirmed","gmp"],
 ["You have to be able to accept failure to get better.","a","","bg"]]],

["Larry Bird","team","Three NBA championships",[
 ["I've got a theory that if you give 100 percent all of the time, somehow things will work out in the end.","a","","gkh"],
 ["A winner is someone who recognizes his God-given talents, works his tail off to develop them into skills, and uses these skills to accomplish his goals.","a","","gc"]]],

["Bill Russell","team","11 NBA championships with the Celtics",[
 ["The most important measure of how good a game I played was how much better I'd made my teammates play.","a","Credited to his memoir Second Wind (1979); not confirmed","gc"]]],

["Kareem Abdul-Jabbar","team","Six NBA championships",[
 ["I think the good and the great are only separated by effort.","a","","gl"]]],

["Julius Erving","team","Dr. J, ABA and NBA champion",[
 ["Being a professional is doing the things you love to do on the days you don't feel like doing them.","a","Widely credited to Erving; no original source found","gkw"]]],

["Giannis Antetokounmpo","team","Two-time NBA MVP, 2021 champion",[
 ["There's no failure in sports.","r","After the Bucks lost to the Heat in the first round, April 26, 2023 (CBS, NPR, ESPN reported it)","bgd"]]],

["Jackie Robinson","team","Broke baseball's colour line in 1947",[
 ["I'm not concerned with your liking or disliking me. All I ask is that you respect me as a human being.","a","","gb"],
 ["A life is not important except in the impact it has on other lives.","r","Inscribed on his gravestone","gm"]]],

["Babe Ruth","team","714 career home runs",[
 ["Every strike brings me closer to the next home run.","a","","bgp"]]],

["Hank Aaron","team","Broke Babe Ruth's home-run record in 1974",[
 ["My motto was always to keep swinging. Whether I was in a slump or feeling badly or having trouble off the field, the only thing to do was keep swinging.","a","","bgk"]]],

["Lou Gehrig","team","Yankees first baseman, 2,130 consecutive games",[
 ["Today I consider myself the luckiest man on the face of the earth.","s","Farewell speech at Yankee Stadium, July 4, 1939","gmd"]]],

["Yogi Berra","team","Ten World Series titles as a player",[
 ["It ain't over till it's over.","r","Said as manager of the 1973 Mets in a July pennant race","bgk"]]],

["Derek Jeter","team","Five World Series titles",[
 ["There may be people that have more talent than you, but there's no excuse for anyone to work harder than you do.","a","Widely credited to him; no original source found","glk"]]],

["Joe DiMaggio","team","56-game hitting streak in 1941",[
 ["There is always some kid who may be seeing me for the first or last time. I owe him my best.","a","","gk"]]],

["Satchel Paige","team","Negro leagues legend; MLB debut at 42",[
 ["Don't look back. Something might be gaining on you.","r","The last of his rules for staying young, Collier's, 1953","gkb"],
 ["Age is a case of mind over matter. If you don't mind, it doesn't matter.","a","","gh"]]],

["Roberto Clemente","team","3,000 hits; died on a relief flight in 1972",[
 ["Any time you have an opportunity to make a difference in this world and you don't, then you are wasting your time on Earth.","a","","gm"]]],

["Walter Payton","team","NFL's all-time leading rusher when he retired",[
 ["Never die easy.","s","Title of his 2000 autobiography, Never Die Easy","bghk"]]],

["Jerry Rice","team","Three Super Bowls; all-time leader in receiving yards",[
 ["Today I will do what others won't, so tomorrow I can accomplish what others can't.","a","Widely credited to Rice; no original source found","lkc"]]],

["Tom Brady","team","Seven Super Bowl wins",[
 ["I'm the best decision this franchise has ever made.","r","What he told Patriots owner Robert Kraft after being drafted 199th in 2000","gwm"]]],

["Roger Staubach","team","Dallas Cowboys quarterback",[
 ["There are no traffic jams along the extra mile.","a","","gk"]]],

["Pelé","team","Three World Cup wins",[
 ["Everything is practice.","a","Widely credited to Pelé; no original source found","lcg"],
 ["Success is no accident. It is hard work, perseverance, learning, studying, sacrifice, and most of all, love of what you are doing.","a","","gl"]]],

["Johan Cruyff","team","Total Football icon",[
 ["Playing football is very simple, but playing simple football is the hardest thing there is.","r","Widely cited, including in his own books and interviews","cg"],
 ["Every disadvantage has its advantage.","r","His best-known saying","bg"]]],

["Lionel Messi","team","2022 World Cup winner",[
 ["I start early, and I stay late, day after day, year after year. It took me 17 years and 114 days to become an overnight success.","a","Widely credited to him; no original interview found","glh"]]],

["Cristiano Ronaldo","team","Five Ballon d'Or awards",[
 ["Talent without working hard is nothing.","a","","gl"]]],

["Mia Hamm","team","Two World Cups, two Olympic golds",[
 ["I am building a fire, and every day I train, I add more fuel. At just the right moment, I light the match.","a","Widely credited to her; no original source found","fxl"],
 ["Somewhere behind the athlete you've become and the hours you've spent traveling to practice is the little girl who fell in love with the game.","a","","gk"]]],

["Abby Wambach","team","Two Olympic golds; record scorer in international soccer",[
 ["Make failure your fuel.","r","Her Barnard College commencement address, May 2018","bgd"]]],

["Wayne Gretzky","team","Four Stanley Cups; 2,857 career points",[
 ["You miss 100 percent of the shots you don't take.","r","He has credited his father; the earliest printed versions are from 1983 and 1996 (traced by Barry Popik)","gkw"],
 ["I skate to where the puck is going to be, not where it has been.","a","He says it came from his father; the earliest print isn't confirmed","cgx"]]],

["Vince Lombardi","coach","Packers coach, five NFL titles",[
 ["Perfection is not attainable, but if we chase perfection we can catch excellence.","a","","glc"],
 ["The difference between a successful person and others is not a lack of strength, not a lack of knowledge, but rather a lack of will.","a","","gkh"],
 ["Practice does not make perfect. Only perfect practice makes perfect.","a","","lc"]]],

["John Wooden","coach","UCLA coach, ten NCAA titles",[
 ["Do not let what you cannot do interfere with what you can do.","r","One of his best-known sayings, widely cited from his books","bgd"],
 ["It's the little details that are vital. Little things make big things happen.","r","From his coaching books and talks","glc"],
 ["Be quick, but don't hurry.","r","A coaching mantra he repeated to his teams","cgk"],
 ["Success is peace of mind, which is a direct result of self-satisfaction in knowing you made the effort to do the best of which you are capable.","s","His own definition of success, the base of his Pyramid of Success","gm"],
 ["Failure is not fatal, but failure to change might be.","a","","bg"],
 ["The best way to improve your team is to improve yourself.","a","","gc"]]],

["Bill Belichick","coach","Eight-time Super Bowl winner as a coach",[
 ["Do your job.","r","The Patriots' working mantra under him, repeated in his press conferences","gkc"]]],

["Bill Walsh","coach","Three Super Bowls with the 49ers",[
 ["The score takes care of itself.","s","Title of his 2009 book, The Score Takes Care of Itself","gck"]]],

["Bill Parcells","coach","Two Super Bowls with the Giants",[
 ["You are what your record says you are.","r","His much-quoted line to players, repeated across his coaching career","bgd"]]],

["Phil Jackson","coach","11 NBA titles as a coach",[
 ["The strength of the team is each individual member. The strength of each member is the team.","a","Credited to his book Sacred Hoops (1995); page not checked","gc"]]],

["Pat Summitt","coach","Tennessee coach, 1,098 wins",[
 ["Left foot, right foot, breathe.","r","Her mantra, told in her memoir Sum It Up (2013)","bgk"],
 ["Discipline yourself so no one else has to.","a","Widely credited to her; the book it comes from isn't confirmed","gk"]]],

["Bear Bryant","coach","Alabama coach, six national titles",[
 ["It's not the will to win, but the will to prepare to win that makes the difference.","a","Also credited to Bobby Knight and Joe Paterno; origin not settled","glx"],
 ["Don't give up at halftime. Concentrate on winning the second half.","a","","bg"]]],

["Pat Riley","coach","Nine NBA titles as a coach",[
 ["Excellence is the gradual result of always striving to do better.","a","","gc"],
 ["Great effort springs naturally from great attitude.","a","","g"]]],

["Dan Gable","coach","Olympic wrestling champion who won gold without giving up a point (1972)",[
 ["Gold medals aren't really made of gold. They're made of sweat, determination, and a hard-to-find alloy called guts.","a","Widely credited to Gable; no original source found","glh"]]],

["Tom Landry","coach","Cowboys coach, two Super Bowls",[
 ["The job of a football coach is to make men do what they don't want to do in order to achieve what they've always wanted to be.","a","","lg"]]],

["Lou Holtz","coach","Notre Dame coach, 1988 national champions",[
 ["Ability is what you're capable of doing. Motivation determines what you do. Attitude determines how well you do it.","a","","gk"]]],

["Jim Valvano","coach","NC State coach, 1983 national champions",[
 ["Don't give up. Don't ever give up.","s","ESPY Awards speech, March 4, 1993, weeks before he died of cancer","bghd"],
 ["Cancer can take away all of my physical abilities. It cannot touch my mind, it cannot touch my heart, and it cannot touch my soul.","s","ESPY Awards speech, March 4, 1993","bgm"]]],

["Bill Bowerman","coach","Oregon track coach, Nike co-founder",[
 ["If you have a body, you are an athlete.","r","His line, later used by Nike","gw"]]],

["Tim Notke","coach","Oregon high-school coach",[
 ["Hard work beats talent when talent doesn't work hard.","r","Credited to Notke, a coach in Oregon; the saying spread widely from there","glk"]]],

["Jocko Willink","mind","Navy SEAL commander, jiu-jitsu black belt",[
 ["Discipline equals freedom.","s","Title of his 2017 book, Discipline Equals Freedom: Field Manual","gkbw"],
 ["Good.","r","His reply to any setback, a theme of Discipline Equals Freedom (2017) and his podcast","bfk"],
 ["Don't expect to be motivated every day to get out there and make things happen. You won't be. Don't count on motivation. Count on discipline.","a","Widely shared from his posts; exact original not confirmed","gkw"]]],

["David Goggins","mind","Navy SEAL and ultramarathoner",[
 ["You have to build calluses on your brain just like how you build calluses on your hands.","a","Credited to Can't Hurt Me (2018); page not verified","gflx"],
 ["When your mind is telling you you're done, you're really only 40 percent done.","a","His 40 percent rule, from Can't Hurt Me (2018); exact wording varies","glpk"],
 ["Stay hard.","r","His sign-off on social media and in his books","gk"],
 ["Be uncommon amongst uncommon people.","r","His motto, from his talks and books","gh"]]],

["George Mallory","mind","British climber, lost on Everest in 1924",[
 ["Because it's there.","s","His answer to why climb Everest, New York Times, March 18, 1923","gh"]]],

["Ed Viesturs","mind","First American to climb all fourteen 8,000-meter peaks",[
 ["Getting to the top is optional. Getting down is mandatory.","r","His rule on the mountain, repeated in his books and talks","dkg"]]],

["Edmund Hillary","mind","First to summit Everest with Tenzing Norgay, May 29, 1953",[
 ["Well, George, we knocked the bastard off.","s","What he told George Lowe on coming down from Everest, 1953","mpg"],
 ["It is not the mountain we conquer, but ourselves.","a","","gh"]]],
];

/* flatten into the shape the app uses: {q, who, cat, desc, t, src, tags, id} */
const REAL_QUOTES = (function(){
  const TAG = {g:'general',l:'lift',f:'fight',c:'craft',k:'streakRisk',b:'comeback',p:'pr',m:'milestone',d:'deload',w:'firstWeek',h:'challenge',x:'camp'};
  const T = {s:'sourced',r:'reported',a:'attributed'};
  const out = [];
  for (const [who,cat,desc,rows] of QLIB){
    for (const [q,t,src,tags] of rows){
      let h = 2166136261; for (let i=0;i<q.length;i++){ h ^= q.charCodeAt(i); h = Math.imul(h,16777619); }
      out.push({id:(h>>>0).toString(36), q, who, cat, desc, t:T[t],
        src: src || ('Widely credited to '+who+'; no original source found, so the exact wording may differ'),
        tags: tags.split('').map(c=>TAG[c])});
    }
  }
  return out;
})();
