import { Component, createSignal, For } from 'solid-js';
import toast from 'solid-toast';

import { DC, dcToString } from './dc';

type Props = {
	dc: DC;
	setDC: (dc: DC) => void;
	onEditEnd: () => void;
};

const loadFromStorage = (): DC[] => {
	const data = localStorage.getItem('dc');
	if (!data) return [];
	return JSON.parse(data);
};

const saveToStorage = (dc: DC[]) => {
	localStorage.setItem('dc', JSON.stringify(dc));
};

const EditView: Component<Props> = (props) => {
	const [dcs, setDCs] = createSignal(loadFromStorage());

	let modValueRef: HTMLInputElement;
	let modDescRef: HTMLInputElement;

	const addModifier = () => {
		if (!modValueRef! || !modDescRef!) return;
		const value = parseInt(modValueRef.value);
		const description = modDescRef.value;
		if (isNaN(value) || !description) {
			toast.error('수정치 값과 설명을 입력해주세요.');
			return;
		}

		props.setDC({
			...props.dc,
			modifiers: [...props.dc.modifiers, { value, description }],
		});
		modValueRef.value = '';
		modDescRef.value = '';
	};

	const handleDone = () => {
		const newDCs = [props.dc, ...dcs()];
		saveToStorage(newDCs);
		props.onEditEnd();
	};

	const openDC = (dc: DC) => {
		props.setDC(dc);
		toast.success(`"${dcToString(dc)}" 불러오기`);
	};

	return (
		<main class="container">
			<div class="center">
				<label>
					<div class="title"> 행동</div>
					<div class="desc"> (설득, 위협, 운동 등) </div>
					<input
						type="text"
						value={props.dc.action}
						onInput={(e) =>
							props.setDC({
								...props.dc,
								action: e.currentTarget.value,
							})
						}
					/>
				</label>

				<label>
					<div class="title"> 능력 </div>
					<div class="desc">
						{' '}
						(근력, 민첩, 건강, 지능, 지혜, 매력){' '}
					</div>
					<input
						type="text"
						value={props.dc.ability}
						onInput={(e) =>
							props.setDC({
								...props.dc,
								ability: e.currentTarget.value,
							})
						}
					/>
				</label>

				<label>
					<div class="title"> 난이도 </div>
					<input
						type="number"
						value={props.dc.difficulty}
						onInput={(e) => {
							const value = parseInt(e.currentTarget.value);
							if (isNaN(value)) return;
							props.setDC({ ...props.dc, difficulty: value });
						}}
					/>
				</label>

				<label>
					<div class="title"> 추가 설명 </div>
					<input
						type="text"
						value={props.dc.information || ''}
						onInput={(e) => {
							props.setDC({
								...props.dc,
								information: e.currentTarget.value,
							});
						}}
					/>
				</label>

				<hr />

				<h3> 수정치 </h3>

				<For each={props.dc.modifiers}>
					{(m, i) => (
						<div class="e-mod">
							<span>
								{m.value} ({m.description})
							</span>
							<button
								class="remove"
								onClick={() =>
									props.setDC({
										...props.dc,
										modifiers: props.dc.modifiers.filter(
											(_, j) => i() !== j
										),
									})
								}
							>
								삭제
							</button>
						</div>
					)}
				</For>

				<label>
					<div class="title"> 수정치 값 </div>
					<input ref={modValueRef!} type="number" />
				</label>

				<label>
					<div class="title"> 수정치 설명 </div>
					<input ref={modDescRef!} type="text" />
				</label>

				<button onClick={addModifier}>추가</button>

				<hr />

				<button onClick={handleDone}>돌아가기</button>

				<hr />

				<h3> 과거 기록 </h3>

				<For each={dcs()}>
					{(dc, i) => (
						<div class="e-past">
							<button onClick={() => openDC(dc)}>
								{dcToString(dc)}
							</button>
							<button
								class="remove"
								onClick={() =>
									setDCs((dcs) =>
										dcs.filter((_, j) => i() !== j)
									)
								}
							>
								삭제
							</button>
						</div>
					)}
				</For>
			</div>
		</main>
	);
};

export default EditView;
