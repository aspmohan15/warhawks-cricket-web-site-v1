// Official Sanctioned Tournament Rules (Extracted from Warhawks Tournament Rules - Season 4)

export const OFFICIAL_TOURNAMENT_RULES = [
  {
    chapter: 1,
    title: 'Chapter 1: General Rules',
    category: 'Tournament general',
    content: `1. All players, captains, and umpires must be aware of the rules before the start of the match.
2. Each innings consists of 8 overs. The first 2 overs will be Powerplay.
3. Each team will play league matches as per the fixture schedule.
4. Tournament standings will be based on match results. In case of a tie, net run rate will be considered.
5. The playing XI must be informed to the umpires before the start of the match. One impact player is allowed during the match.
6. The organizing committee reserves the right to modify the schedule or format based on match situations.
7. Each innings will begin with a new ball.
8. Only the captain and the concerned player are allowed to discuss issues with the umpire (OTHER PLAYERS SHOULD NOT INVOLVE).
9. In rare cases, the organizing committee may intervene if umpires are unable to reach a decision.
10. The umpire's decision is final.`
  },
  {
    chapter: 2,
    title: 'Chapter 2: Match Format & Timings',
    category: 'Tournament general',
    content: `1. Each match duration is 1 hour 25 minutes, including a 5-minute innings break.
2. Each innings is limited to 40 minutes, including water/strategy breaks.
3. The bowling team is responsible for maintaining the over rate and calling for breaks between overs (3-4 or 4-5 or 5-6).
4. Teams should minimize delays during water/strategy breaks.
5. Incoming batters must enter the field immediately after a wicket falls.
6. No official lunch break will be provided between matches.`
  },
  {
    chapter: 3,
    title: 'Chapter 3: Batting Rules',
    category: 'Tournament general',
    content: `1. One batter is allowed to retire out and may return as the last batter.
2. A batter retired due to injury may resume batting if fit.
3. Appeals for illegal bowling actions (throwing) can be raised to the umpire.
4. A batter may leave the crease only after informing the umpire or after the call of "Over."
5. Runners are not allowed except in case of injury during the match.`
  },
  {
    chapter: 4,
    title: 'Chapter 4: Bowling Rules',
    category: 'Tournament general',
    content: `1. A minimum of 5 bowlers must be used.
2. A maximum of 3 bowlers can bowl up to 2 overs each.
3. One bouncer per over is permitted. A second bouncer above shoulder height will be called a no-ball.
4. Mankading is allowed only if the bowler breaks the stumps before starting the action. First instance will result in a warning; subsequent instances will result in dismissal.
5. A substitute or wicketkeeper must field at least one over before being eligible to bowl.
6. If a bowler is found throwing, a warning will be issued for the first occurrence; subsequent violations will result in the over being disallowed.
7. There is no restriction on waist-height no-balls. Every no-ball result in a free hit.`
  },
  {
    chapter: 5,
    title: 'Chapter 5: Bowling Guard Rules',
    category: 'Tournament general',
    content: `- The bowler must inform the umpire of the bowling guard (over or around the wicket) before the first delivery.
- Any change in bowling guard during the over or subsequent deliveries must be clearly communicated to the umpire before delivery.
- Declaring an alternate guard at the first instance is not permitted.
- Failure to inform the umpire of the bowling guard or any change will result in a no-ball.`
  },
  {
    chapter: 6,
    title: 'Chapter 6: Fielding Rules',
    category: 'Tournament general',
    content: `1. A maximum of 5 fielders are allowed outside the 30-yard circle in non-Powerplay overs.
2. Only 2 fielders are allowed outside the circle during Powerplay.
3. Overthrows and byes are permitted.
4. Wicketkeeper or substitute changes must be communicated to the umpire.
5. Batters may continue running between wickets until the ball reaches the bowler or wicketkeeper.
6. A maximum of five fielders are permitted on the leg side, irrespective of whether the bowler is bowling over or around the wicket. This limit excludes the bowler and wicketkeeper, and applies for a right-handed batter (and vice versa for a left-handed batter).
7. No more than 2 fielders are allowed in blind spot areas (fine leg/short leg).
8. Batsmen should not block the Ball intentionally while the fielder throws the ball either to the Striker or non-striker end. (If the fielding team appeals for such a thing, the umpire will take the decision accordingly).
9. Runs are allowed if the ball unintentionally deflects off a batter during a throw.`
  },
  {
    chapter: 7,
    title: 'Chapter 7: Powerplay & Super Over',
    category: 'Tournament general',
    content: `1. The first 2 overs of each innings constitute the Powerplay.
2. In case of a tie, a Super Over will be played.
3. If the Super Over is also tied, additional Super Overs will be played until a result is achieved.`
  },
  {
    chapter: 8,
    title: 'Chapter 8: Extras Rules',
    category: 'Tournament general',
    content: `1. A wide will be called if the ball passes above the batter's head.
2. Wide if the ball is on the line or the correct ball will be decided once looking into the ground on the match day.
3. If a batter switches stance completely, the opposite wide guideline applies.
4. If only the bat is switched, the original stance will be considered.
5. Every no-ball result in a free hit.`
  },
  {
    chapter: 9,
    title: 'Chapter 9: No-Ball Conditions',
    category: 'Tournament general',
    content: `- Ball above waist height
- Overstepping the crease
- Ball bouncing more than once before reaching the batter
- Ball pitching outside the designated playing area
- More than 5 fielders outside the 30-yard circle
- Failure to inform the umpire about bowling guard or change in guard
- Unauthorized or deceptive movement of any fielder during the bowler runup (warning followed by no-ball)
- Fielders communicating or encouraging after the bowler begins run-up (warning followed by no-ball)
- Wicketkeeper awkward movement during the bowler's run-up
- Second bouncer in an over.`
  },
  {
    chapter: 10,
    title: 'Chapter 10: Other Rules',
    category: 'Tournament general',
    content: `1. Retired hurt is allowed only if the umpire is satisfied with the reason.
2. A runner may be used only until the last over in case of injury.
3. Substitutions are allowed with the captain's approval.
4. Leg byes and LBW dismissals are not permitted.`
  }
];

export const getDefaultEditionRules = (tournamentId) => {
  if (!tournamentId) return [];
  const now = new Date().toISOString();
  return OFFICIAL_TOURNAMENT_RULES.map((rule, idx) => ({
    id: `rule-${tournamentId}-${idx + 1}`,
    tournamentId,
    title: rule.title,
    category: rule.category,
    content: rule.content,
    videoUrl: '',
    isPublished: true,
    updatedAt: now
  }));
};
