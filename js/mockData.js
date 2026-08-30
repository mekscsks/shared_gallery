// Mock data — shaped exactly like the rows the future PHP + MySQL API
// will return, so js/api.js can be pointed at real endpoints later
// without any page needing to change.
window.MOCK_DB = (function () {
  const event = {
    id: 1,
    slug: 'rcy-training-2026',
    name: 'RCY Training 2026',
    tagline: 'Share your favorite moments with us.',
    description: 'A day of first-aid drills, teamwork, and a little bit of chaos in the best way. Snap it, upload it, and let\u2019s build the memory wall together.',
    date: '2026-08-22',
    dateLabel: 'August 22, 2026',
    timeLabel: '8:00 AM \u2013 5:00 PM',
    location: 'National College of Science & Technology, Dasmari\u00f1as, Cavite',
    organizer: 'Philippine Red Cross Youth \u2013 NCST Chapter',
    heroImage: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=1600&auto=format&fit=crop',
    logoInitials: 'RCY',
    theme: { primary: '#E11D3C', accent: '#E8A33D' },
    isPrivate: true,
    settings: {
      galleryVisible: true,
      guestbookEnabled: true,
      photoUploadsEnabled: true,
      videoUploadsEnabled: true,
      photoStripEnabled: true
    },
    stats: { photos: 128, videos: 14, guests: 76, messages: 42, storageUsedGB: 3.4, storageLimitGB: 15 }
  };

  const names = ['Miko Vargas', 'Aldrin Cruz', 'Bea Santos', 'Josh Ramirez', 'Nicole Tan', 'Paolo Reyes', 'Katrina Uy', 'Marco Dela Cruz', 'Ivy Lim', 'Renz Aquino'];
  const photoUrls = [
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508162356415-73d5aa4d38ef?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1515169067868-5387ec356754?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560439514-4e9645039924?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496843916299-590492c751f4?q=80&w=900&auto=format&fit=crop'
  ];
  const captions = [
    'Such a fun training day \u2764\ufe0f', 'Bandage relay champions right here \ud83c\udfc6', 'CPR drills got intense \ud83d\ude05',
    'Team huddle before the final activity', 'Best training weekend ever', 'Learned so much today, grateful for this batch',
    'That lunch break tho \ud83c\udf5b', null, 'Golden hour after the closing program', null,
    'Proud RCY volunteer moment', 'Group photo before we all went home', null, 'First aid stations in full swing',
    'The energy in this room all day', null
  ];

  const photos = photoUrls.map((url, i) => ({
    id: 'p' + (i + 1),
    type: 'photo',
    url,
    // Real records will carry distinct thumbnail/medium/original derivatives
    // generated server-side after the Drive upload. Mock data points all
    // three at the same source image.
    thumbUrl: url,
    mediumUrl: url,
    originalUrl: url,
    uploaderName: names[i % names.length],
    caption: captions[i % captions.length],
    uploadedAt: new Date(2026, 7, 22, 8 + (i % 9), (i * 7) % 60).toISOString(),
    aspect: [3 / 4, 1, 4 / 3, 9 / 16, 1, 4 / 5][i % 6],
    featured: i === 1 || i === 8,
    hidden: false,
    likes: (i * 13) % 40
  }));

  const videos = [1, 2, 3, 4, 5, 6].map((n) => ({
    id: 'v' + n,
    type: 'video',
    url: '#',
    thumbUrl: photoUrls[(n * 3) % photoUrls.length],
    mediumUrl: photoUrls[(n * 3) % photoUrls.length],
    originalUrl: '#',
    uploaderName: names[(n + 3) % names.length],
    caption: n === 1 ? 'The whole opening program in 40 seconds' : null,
    uploadedAt: new Date(2026, 7, 22, 9 + n, 0).toISOString(),
    durationLabel: ['0:18', '0:42', '1:05', '0:24', '0:51', '0:12'][n - 1],
    aspect: 9 / 16,
    featured: n === 2,
    hidden: false,
    likes: (n * 9) % 30
  }));

  const guestbook = [
    { id: 'g1', guestName: 'Miko Vargas', message: 'Had such an amazing time! \u2764\ufe0f Thank you RCY for having me.', createdAt: '2026-08-22T14:20:00', hidden: false },
    { id: 'g2', guestName: 'Aldrin Cruz', message: 'Learned so much today. See you all at the next training!', createdAt: '2026-08-22T15:05:00', hidden: false },
    { id: 'g3', guestName: 'Bea Santos', message: 'Our team\u2019s bandaging finally didn\u2019t fall apart \ud83d\ude02 proud of us', createdAt: '2026-08-22T15:40:00', hidden: false },
    { id: 'g4', guestName: 'Josh Ramirez', message: 'Shoutout to the facilitators, ang galing niyo mag-turo!', createdAt: '2026-08-22T16:02:00', hidden: false },
    { id: 'g5', guestName: 'Nicole Tan', message: 'Tired pero happy. Worth it talaga.', createdAt: '2026-08-22T16:30:00', hidden: false },
    { id: 'g6', guestName: 'Paolo Reyes', message: 'This batch is different \u2014 love the energy today.', createdAt: '2026-08-22T17:10:00', hidden: false }
  ];

  const photoStripTemplates = [
    { id: 'classic', name: 'Classic Vertical', desc: 'The timeless 3-photo strip with a clean footer.', frames: 3, frameShape: 'square', bg: '#FFFFFF', text: '#1A1310' },
    { id: 'minimal', name: 'Minimal', desc: 'Thin borders, lots of white space, quiet type.', frames: 3, frameShape: 'square', bg: '#FFFBF8', text: '#4D3F39' },
    { id: 'branded', name: 'Event Branded', desc: 'Event logo, name and colors built right in.', frames: 3, frameShape: 'rounded', bg: '#E11D3C', text: '#FFFFFF' },
    { id: 'playful', name: 'Fun & Playful', desc: 'Stickers, tilt, and a pop of gold.', frames: 4, frameShape: 'rounded', bg: '#FFD9CE', text: '#7A0C1F' }
  ];

  return { event, photos, videos, guestbook, photoStripTemplates, names };
})();
