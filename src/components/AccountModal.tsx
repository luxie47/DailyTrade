import { useState } from 'react';
import type { Account, Currency } from '../types/account';
import type { AppState } from '../services/storage';
import { AboutView } from '../features/account/AboutView';
import { AccountCreateView } from '../features/account/AccountCreateView';
import { AccountListView } from '../features/account/AccountListView';

export type View = 'list' | 'create' | 'about';

interface Props {
  accounts: Account[];
  activeAccountId: string;
  state: AppState;
  initialView?: View;
  onSwitch: (id: string) => void;
  onCreate: (name: string, currency: Currency, startingCash: number) => void;
  onTopUp: (amount: number) => void;
  onReset: (cash: number) => void;
  onDelete: (id: string) => void;
  onUpdateCurrency: (c: Currency) => void;
  onImport?: (state: AppState) => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
  onClose: () => void;
}

export function AccountModal({
  accounts,
  activeAccountId,
  state,
  initialView = 'list',
  onSwitch,
  onCreate,
  onTopUp,
  onReset,
  onDelete,
  onUpdateCurrency,
  onOpenExport,
  onOpenImport,
  onClose,
}: Props) {
  const [view, setView] = useState<View>(initialView);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="modal-sheet" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        {view === 'about' && (
          <AboutView onBack={() => setView('list')} onClose={onClose} />
        )}
        {view === 'create' && (
          <AccountCreateView
            onBack={() => setView('list')}
            onCreate={(name, currency, cash) => {
              onCreate(name, currency, cash);
              onClose();
            }}
          />
        )}
        {view === 'list' && (
          <AccountListView
            accounts={accounts}
            activeAccountId={activeAccountId}
            state={state}
            onSwitch={onSwitch}
            onOpenCreate={() => setView('create')}
            onOpenAbout={() => setView('about')}
            onTopUp={onTopUp}
            onReset={onReset}
            onDelete={onDelete}
            onUpdateCurrency={onUpdateCurrency}
            onOpenExport={onOpenExport}
            onOpenImport={onOpenImport}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
