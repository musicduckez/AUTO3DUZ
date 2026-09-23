export interface City {
  id: string;
  name: { ru: string; uz: string };
  days: number;
  fee: number;
}

export const cities: City[] = [
  { id: 'tashkent', name: { ru: 'Ташкент', uz: 'Toshkent' }, days: 1, fee: 25000 },
  { id: 'samarkand', name: { ru: 'Самарканд', uz: 'Samarqand' }, days: 2, fee: 45000 },
  { id: 'bukhara', name: { ru: 'Бухара', uz: 'Buxoro' }, days: 3, fee: 55000 },
  { id: 'namangan', name: { ru: 'Наманган', uz: 'Namangan' }, days: 2, fee: 50000 },
  { id: 'andijan', name: { ru: 'Андижан', uz: 'Andijon' }, days: 3, fee: 55000 },
  { id: 'fergana', name: { ru: 'Фергана', uz: 'Farg‘ona' }, days: 3, fee: 55000 },
  { id: 'nukus', name: { ru: 'Нукус', uz: 'Nukus' }, days: 4, fee: 75000 },
  { id: 'karshi', name: { ru: 'Карши', uz: 'Qarshi' }, days: 3, fee: 55000 },
  { id: 'termez', name: { ru: 'Термез', uz: 'Termiz' }, days: 4, fee: 70000 },
  { id: 'urgench', name: { ru: 'Ургенч', uz: 'Urganch' }, days: 4, fee: 70000 },
  { id: 'jizzakh', name: { ru: 'Джизак', uz: 'Jizzax' }, days: 2, fee: 45000 },
  { id: 'navoi', name: { ru: 'Навои', uz: 'Navoiy' }, days: 3, fee: 50000 },
  { id: 'gulistan', name: { ru: 'Гулистан', uz: 'Guliston' }, days: 2, fee: 40000 },
];
