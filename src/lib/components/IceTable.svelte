<script lang="ts">
	type Props = {
		species: string[];
		initial: string[];
		change: string[];
		equilibrium: string[];
	};

	let { species, initial, change, equilibrium }: Props = $props();

	const rows = $derived([
		{ label: 'I', values: initial },
		{ label: 'C', values: change },
		{ label: 'E', values: equilibrium }
	]);
</script>

<table class="overflow-hidden rounded-3xl bg-mantle text-lg ring-1 ring-surface0">
	<thead>
		<tr class="bg-crust">
			<th class="px-6 py-3"></th>
			{#each species as name (name)}
				<th class="px-6 py-3 font-semibold">{name}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.label)}
			<tr class="border-t border-surface0">
				<th class="px-6 py-3 font-semibold text-subtext0">{row.label}</th>
				{#each row.values as value, i (i)}
					<td class="px-6 py-3 text-center">{value}</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
