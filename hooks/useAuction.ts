
import { useContext } from 'react';
import { AuctionContext } from '../contexts/AuctionContext';

export const useAuction = () => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
};
