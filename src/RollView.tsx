import { Component, createSignal, For, Match, Switch } from 'solid-js';

import { DC } from './dc';
import Dice from './Dice';

type Props = {
	dc: DC;
	onEditStart?: () => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type State = 'idle' | 'rolling' | 'done';

const RollView: Component<Props> = (props) => {
	const [sig, setSig] = createSignal(0);
	const [result, setResult] = createSignal('성공');
	const [total, setTotal] = createSignal(0);
	const [state, setState] = createSignal<State>('idle');

	let resultTextRef: HTMLDivElement;
	let resultTotalRef: HTMLDivElement;
	let clickGuideRef: HTMLDivElement;

	const vibe = () => {
		if (navigator.vibrate) {
			navigator.vibrate(10);
		}
	};

	const resetState = async () => {
		resultTotalRef!.classList.add('hide-label');
		resultTextRef!.classList.add('hide-label');

		await sleep(200);
		clickGuideRef!.classList.remove('opacity-0');

		setResult('1');
		setTotal(0);
		setState('idle');
	};

	const handleClick = async () => {
		switch (state()) {
			case 'idle':
				// Roll Start
				setSig((s) => s + 1);
				clickGuideRef!.classList.add('opacity-0');
				setState('rolling');
				break;
			case 'rolling':
				// Do nothing
				break;
			case 'done':
				// Reset to idle
				resetState();
				await sleep(500);
				break;
		}
	};

	const handleDiceDone = async (n: number) => {
		let total =
			n + props.dc.modifiers.reduce((acc, m) => acc + m.value, 0);
		resultTextRef!.classList.remove('critical-success');
		resultTextRef!.classList.remove('bad');
		if (n === 20) {
			setResult('대성공');
			resultTextRef!.classList.add('critical-success');
			total = 20;
		} else if (total >= props.dc.difficulty) {
			setResult('성공');
		} else if (n === 1) {
			setResult('대실패');
			resultTextRef!.classList.add('bad');
			total = 1;
		} else {
			setResult('실패');
			resultTextRef!.classList.add('bad');
		}

		console.log('Total:', total);
		setTotal(total);
		resultTotalRef!.classList.remove('hide-label');
		await sleep(250);
		resultTextRef!.classList.remove('hide-label');

		setState('done');
	};

	return (
		<>
			<main class="container">
				<div class="center">
					<div class="kind">
						<h1>{props.dc.action || 'Action'}</h1>
						<h2>{props.dc.ability || 'Ability'}</h2>
					</div>
					<div class="dc" onClick={handleClick}>
						<div class="difficulty">
							<h2> 난이도 </h2>
							<div class="difficulty-num">
								{props.dc.difficulty}
							</div>
						</div>
						<div class="dice-container">
							<div class="dices">
								<Dice
									trigger={sig()}
									onIntChange={vibe}
									onUpdate={handleDiceDone}
								/>
							</div>
							<div class="result">
								<div
									ref={resultTotalRef!}
									class="value hide-label"
								>
									{total()}
								</div>
								<div
									ref={resultTextRef!}
									class="text hide-label"
								>
									{result()}
								</div>
							</div>
							<div ref={clickGuideRef!}>
								<div class="click-guide">
									굴리려면 주사위를 <b>클릭</b>하세요.
								</div>
								<div class="additional-info">
									{props.dc.information || ''}&nbsp;
								</div>
							</div>
						</div>
					</div>
					<div class="modifiers">
						<For each={props.dc.modifiers}>
							{(m) => (
								<div class="modifier">
									<Switch>
										<Match when={m.value >= 0}>
											<div class="modifier-value positive">
												+{m.value}
											</div>
										</Match>
										<Match when={m.value < 0}>
											<div class="modifier-value negative">
												{m.value}
											</div>
										</Match>
									</Switch>
									<div class="modifier-description">
										{m.description}
									</div>
								</div>
							)}
						</For>
					</div>
					<button class="edit-button" onClick={props.onEditStart}>
						수정
					</button>
				</div>
			</main>
		</>
	);
};

export default RollView;
