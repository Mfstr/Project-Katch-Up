import SmartFocusUI from '../components/SmartFocusUI.jsx';

export default function Home() {
    return (
        <div className="home-page">
            <main>
                <section id="smart-focus" className="home-smart-focus">
                    <SmartFocusUI />
                </section>
            </main>
        </div>
    );
}