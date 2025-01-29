import { mat4, vec2, vec3 } from 'gl-matrix';
import { Component, createEffect, onCleanup, onMount } from 'solid-js';

import * as g from './dice-webgl';

type Props = {
	trigger?: number;
	onIntChange?: (num: number) => void;
	onUpdate?: (num: number) => void;
};

const Dice: Component<Props> = (props) => {
	let ref: HTMLCanvasElement;

	let ctx: g.GContext | null = null;

	let running = true;

	let angleSpeed = 0;
	let dist = 0.0;
	let axis: vec3 = [1, 0, 0];

	const pos = vec2.create();
	let posV = vec2.create();

	let modelMatrix = mat4.create();

	const initSpeed = 0.5;
	const threshold = 0.003;
	let lastRender = Date.now();
	let lastNum = -1;

	const render = (force?: boolean) => {
		if (ctx) {
			const dt = (Date.now() - lastRender) / 1000;
			lastRender = Date.now();
			if (force || angleSpeed > threshold) {
				const a = angleSpeed * dt;

				const dp = vec2.create();
				vec2.scale(dp, posV, dt);
				vec2.add(pos, pos, dp);
				vec2.scale(posV, posV, Math.pow(0.5, dt));
				vec2.scale(pos, pos, Math.pow(0.08, dt));

				// Rotate model matrix
				mat4.rotate(modelMatrix, modelMatrix, angleSpeed, axis);
				axis[0] += a * Math.random();
				axis[1] += a * Math.random();
				axis[2] += a * Math.random();
				angleSpeed *= Math.pow(0.2, dt);
				vec3.normalize(axis, axis);

				modelMatrix = g.rotateToNearestFace(ctx, modelMatrix, 0.05);

				const redFac = Math.pow(0.1, dt);
				dist = dist * redFac + (1 - redFac) * angleSpeed;
				console.log(dist);

				if (!force && angleSpeed < threshold) {
					const n = g.findFrontFace(ctx, modelMatrix);
					props.onUpdate?.(n);
				}

				const newFace = g.findFrontFace(ctx, modelMatrix);
				if (newFace !== lastNum) {
					lastNum = newFace;
					props.onIntChange?.(newFace);
				}

				g.drawScene(ctx, modelMatrix, [pos[0], pos[1], 2 * dist]);
			}
		}

		if (running) requestAnimationFrame(() => render());
	};

	onMount(() => {
		running = true;
		ctx = g.newGContext(ref!);

		modelMatrix = g.rotateToNearestFace(ctx, modelMatrix, 1.0, 20);

		render(true);
	});

	onCleanup(() => {
		running = false;
	});

	createEffect(() => {
		if ((props.trigger || 0) <= 0) return;

		posV = [Math.random() * 2 - 1, Math.random() * 2 - 1];

		angleSpeed = initSpeed;
		lastRender = Date.now() - 5;

		axis = [1, 0, 0];
		mat4.rotateX(modelMatrix, modelMatrix, Math.random() * Math.PI * 2);
		mat4.rotateY(modelMatrix, modelMatrix, Math.random() * Math.PI * 2);
	});

	return (
		<div class="dice">
			<div class="dice-shadow" />
			<canvas width={192} height={192} ref={ref!} />
		</div>
	);
};

export default Dice;
