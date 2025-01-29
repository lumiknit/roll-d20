import { TbBrandGithub } from 'solid-icons/tb';
import { createSignal, Match, Switch } from 'solid-js';
import { Toaster } from 'solid-toast';

import { defaultDC } from './dc';
import EditView from './Editview';
import RollView from './RollView';

const App = () => {
	const [dc, setDC] = createSignal({ ...defaultDC });
	const [editing, setEditing] = createSignal(false);

	return (
		<>
			<a class="gh" href="https://github.com/lumiknit/roll-d20">
				<TbBrandGithub />
				GitHub
			</a>
			<Switch>
				<Match when={editing()}>
					<EditView
						dc={dc()}
						setDC={setDC}
						onEditEnd={() => setEditing(false)}
					/>
				</Match>
				<Match when>
					<RollView dc={dc()} onEditStart={() => setEditing(true)} />
				</Match>
			</Switch>

			<Toaster />
		</>
	);
};

export default App;
