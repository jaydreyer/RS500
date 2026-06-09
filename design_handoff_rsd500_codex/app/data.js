/* RSD 500 Randomizer — sample data for the DESIGN PROTOTYPE only.
 * Album metadata below is illustrative (well-known RS500 entries) so the
 * board looks real. In production this is seeded from the owner's dataset
 * (PRD §9) — do NOT treat this file as the source of truth.            */
(function () {
  // ---- Crew --------------------------------------------------------------
  const MEMBERS = [
    { id: 'u_you', name: 'You',      handle: 'you',     hue: 14,  initials: 'YO' },
    { id: 'u_mara', name: 'Mara',    handle: 'mara',    hue: 268, initials: 'MA' },
    { id: 'u_des',  name: 'Desmond', handle: 'des',     hue: 200, initials: 'DE' },
    { id: 'u_priya',name: 'Priya',   handle: 'priya',   hue: 332, initials: 'PR' },
    { id: 'u_theo', name: 'Theo',    handle: 'theo',    hue: 150, initials: 'TH' },
    { id: 'u_june', name: 'June',    handle: 'june',    hue: 38,  initials: 'JU' },
  ];

  // ---- Catalog (illustrative RS500 slice) --------------------------------
  const A = (rank, title, artist, year) => ({ id: 'a' + rank, rank, title, artist, year });
  const ALBUMS = [
    A(1,  "What's Going On", 'Marvin Gaye', 1971),
    A(2,  'Pet Sounds', 'The Beach Boys', 1966),
    A(3,  'Blue', 'Joni Mitchell', 1971),
    A(4,  'Songs in the Key of Life', 'Stevie Wonder', 1976),
    A(5,  'Abbey Road', 'The Beatles', 1969),
    A(8,  'Purple Rain', 'Prince & The Revolution', 1984),
    A(9,  'Blood on the Tracks', 'Bob Dylan', 1975),
    A(12, 'Kind of Blue', 'Miles Davis', 1959),
    A(15, 'Highway 61 Revisited', 'Bob Dylan', 1965),
    A(19, 'Innervisions', 'Stevie Wonder', 1973),
    A(20, 'To Pimp a Butterfly', 'Kendrick Lamar', 2015),
    A(24, 'The Velvet Underground & Nico', 'The Velvet Underground', 1967),
    A(26, 'Horses', 'Patti Smith', 1975),
    A(28, 'Off the Wall', 'Michael Jackson', 1979),
    A(31, 'Tapestry', 'Carole King', 1971),
    A(33, 'The Chronic', 'Dr. Dre', 1992),
    A(38, 'Marquee Moon', 'Television', 1977),
    A(42, 'Dummy', 'Portishead', 1994),
    A(44, 'Aretha Now', 'Aretha Franklin', 1968),
    A(47, 'OK Computer', 'Radiohead', 1997),
    A(53, 'Born to Run', 'Bruce Springsteen', 1975),
    A(60, 'Master of Puppets', 'Metallica', 1986),
    A(64, 'Paid in Full', 'Eric B. & Rakim', 1987),
    A(69, 'Maggot Brain', 'Funkadelic', 1971),
    A(77, 'Dusty in Memphis', 'Dusty Springfield', 1969),
    A(83, 'I Want to See the Bright Lights Tonight', 'Richard & Linda Thompson', 1974),
    A(91, 'Sign o the Times', 'Prince', 1987),
    A(99, 'Either/Or', 'Elliott Smith', 1997),
    A(110,'The Stooges', 'The Stooges', 1969),
    A(124,'Aja', 'Steely Dan', 1977),
    A(131,'In the Wee Small Hours', 'Frank Sinatra', 1955),
    A(146,'Solid Air', 'John Martyn', 1973),
    A(158,'CrazySexyCool', 'TLC', 1994),
    A(172,'Endtroducing.....', 'DJ Shadow', 1996),
    A(188,'Spiderland', 'Slint', 1991),
    A(199,'Wild Is the Wind', 'Nina Simone', 1966),
    A(214,'Loveless', 'My Bloody Valentine', 1991),
    A(231,'Bryter Layter', 'Nick Drake', 1971),
    A(247,'Sound of Silver', 'LCD Soundsystem', 2007),
    A(266,'Madvillainy', 'Madvillain', 2004),
    A(288,'Selected Ambient Works 85–92', 'Aphex Twin', 1992),
    A(301,'Doolittle', 'Pixies', 1989),
    A(333,'Untrue', 'Burial', 2007),
    A(366,'In Rainbows', 'Radiohead', 2007),
    A(401,'Black Messiah', "D'Angelo and the Vanguard", 2014),
    A(444,'Cosmos Rapture', 'Sault', 2021),
    A(467,'A Seat at the Table', 'Solange', 2016),
    A(488,'Skeleton Tree', 'Nick Cave & The Bad Seeds', 2016),
  ];
  const byId = {}; ALBUMS.forEach(a => byId[a.id] = a);

  // ---- Listens (board history) ------------------------------------------
  // helper: L(user, albumRank, kind, status, rating, take, week)
  let _n = 0;
  const L = (user, rank, kind, status, rating, take, week) =>
    ({ id: 'l' + (++_n), user, album: 'a' + rank, kind, status,
       rating, take, week, created: week });

  const LISTENS = [
    // ---- current week 2026-W23 (the Board) ----
    L('u_you',  47,  'fresh', 'listening', null, null, '2026-W23'),
    L('u_mara', 266, 'fresh', 'rated', 9, 'Villain doom-jazz. Lost a weekend to it.', '2026-W23'),
    L('u_des',  53,  'fresh', 'rated', 7, 'Bombast earned. The sax solo, c\u2019mon.', '2026-W23'),
    L('u_priya',158, 'fresh', 'listening', null, null, '2026-W23'),
    L('u_theo', 214, 'fresh', 'rated', 6, 'Beautiful wall of mud. Need a lie down.', '2026-W23'),
    L('u_june', 31,  'fresh', 'rated', 10, 'Comfort record. No notes, perfect.', '2026-W23'),
    // skips logged this week
    L('u_des',  5,   'skip',  'rated', 8, 'Heard it a thousand times, still 8.', '2026-W23'),
    L('u_june', 1,   'skip',  'rated', 9, null, '2026-W23'),

    // ---- W22 ----
    L('u_you',  20,  'fresh', 'rated', 10, 'Generational. Sat with it twice.', '2026-W22'),
    L('u_mara', 99,  'fresh', 'rated', 8, 'Cried on the bus. Thanks, randomizer.', '2026-W22'),
    L('u_des',  60,  'fresh', 'rated', 7, null, '2026-W22'),
    L('u_priya',467, 'fresh', 'rated', 9, 'A whole mood. Cranford Nantucket.', '2026-W22'),
    L('u_theo', 38,  'fresh', 'rated', 8, 'Twin guitars forever.', '2026-W22'),
    L('u_june', 333, 'fresh', 'rated', 7, 'Rain music. Correctly named.', '2026-W22'),
    L('u_you',  2,   'skip',  'rated', 9, null, '2026-W22'),
    L('u_mara', 24,  'skip',  'rated', 8, null, '2026-W22'),

    // ---- W21 ----
    L('u_you',  172, 'fresh', 'rated', 8, 'Crate-digging the album. Meta.', '2026-W21'),
    L('u_mara', 214, 'fresh', 'rated', 7, null, '2026-W21'),
    L('u_des',  124, 'fresh', 'rated', 9, 'Yacht rock apologists, we won.', '2026-W21'),
    L('u_priya',26,  'fresh', 'rated', 9, 'Patti contains multitudes.', '2026-W21'),
    L('u_theo', 288, 'fresh', 'rated', 6, 'Fell asleep. Complimentary.', '2026-W21'),
    L('u_june', 77,  'fresh', 'rated', 8, null, '2026-W21'),
    L('u_priya',8,   'skip',  'rated', 10, null, '2026-W21'),

    // ---- W20 ----
    L('u_you',  301, 'fresh', 'rated', 9, 'Loud quiet loud. The blueprint.', '2026-W20'),
    L('u_mara', 91,  'fresh', 'rated', 10, 'Double album, zero filler. Insane.', '2026-W20'),
    L('u_des',  44,  'fresh', 'rated', 8, null, '2026-W20'),
    L('u_priya',42,  'fresh', 'rated', 7, 'Trip-hop for a rainy flat.', '2026-W20'),
    L('u_theo', 110, 'fresh', 'rated', 7, null, '2026-W20'),
    L('u_june', 199, 'fresh', 'rated', 9, 'Nina could read a menu, 9.', '2026-W20'),

    // ---- W19 ----
    L('u_you',  247, 'fresh', 'rated', 8, 'Aging, dancing, crying. All at once.', '2026-W19'),
    L('u_mara', 488, 'fresh', 'rated', 6, 'Heavy. Needed sunlight after.', '2026-W19'),
    L('u_des',  131, 'fresh', 'rated', 8, null, '2026-W19'),
    L('u_priya',231, 'fresh', 'rated', 8, null, '2026-W19'),
    L('u_theo', 401, 'fresh', 'rated', 9, 'Slept-on. The groove is illegal.', '2026-W19'),
    L('u_june', 146, 'fresh', 'rated', 7, null, '2026-W19'),
    L('u_theo', 69,  'skip',  'rated', 9, null, '2026-W19'),
    L('u_des',  9,   'skip',  'rated', 9, null, '2026-W19'),
  ];

  // ---- Reactions ---------------------------------------------------------
  // R(listenId, user, emoji, comment)
  const R = (listen, user, emoji, comment) => ({ id: 'r' + listen + user, listen, user, emoji, comment });
  const REACTIONS = [
    R('l2', 'u_you', '🔥', null),
    R('l2', 'u_des', '🔥', 'doom-jazz is now a genre because of you'),
    R('l2', 'u_june', '🤯', null),
    R('l3', 'u_mara', '🎷', null),
    R('l6', 'u_you', '💯', 'carole king supremacy'),
    R('l6', 'u_priya', '❤️', null),
    R('l5', 'u_des', '😵', null),
    R('l1', 'u_mara', '👀', 'OK Computer?? report back'),
    R('l1', 'u_theo', '🤖', null),
  ];

  const CURRENT_WEEK = '2026-W23';
  const WEEKS = ['2026-W23','2026-W22','2026-W21','2026-W20','2026-W19'];
  const ME = 'u_you';
  const INVITE_CODE = 'VINYL-NIGHT';

  window.RSD = {
    MEMBERS, ALBUMS, byId, LISTENS, REACTIONS,
    CURRENT_WEEK, WEEKS, ME, INVITE_CODE,
    member: (id) => MEMBERS.find(m => m.id === id),
    album: (id) => byId[id],
  };
})();
