import React from 'react';
import { ApplicationErrorBoundary } from './applicationErrorBoundary';
import { AppBootstrap } from './AppBootstrap';
import { AppRouter } from './AppRouter';

export function App() {
    return (
        <ApplicationErrorBoundary>
            <AppBootstrap>
                <AppRouter />
            </AppBootstrap>
        </ApplicationErrorBoundary>
    );
}

export default App;
