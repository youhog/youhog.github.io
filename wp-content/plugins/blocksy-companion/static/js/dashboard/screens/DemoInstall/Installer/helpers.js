import { __ } from 'ct-i18n'

export const GENERIC_MESSAGE = __(
	"Unfortunately, your hosting configuration doesn't meet the minimum requirements for importing a starter site.",
	'blocksy-companion'
)

export const prepareUrl = (query_string) => {
	const params = new URLSearchParams({
		nonce: ctDashboardLocalizations.dashboard_actions_nonce,
		wp_customize: 'on',
		...query_string,
	})

	return `${ctDashboardLocalizations.ajax_url}?${params.toString()}`
}

const performSingleRequest = async (request, requestsPayload, extraBody = {}) => {
	const response = await fetch(prepareUrl(request.params), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			requestsPayload,
			...(request.body || {}),
			...extraBody,
		}),
	})

	return response
}

export const performRequestWithExponentialBackoff = async (
	request,
	requestsPayload,
	{ maxRetries = 5 } = {}
) => {
	let attempt = 0
	const label = request.title
	const isContentRequest = request.params.action === 'blocksy_demo_install_content'

	while (attempt < maxRetries) {
		// Run cleanup request before retry attempts (not on first attempt)
		if (attempt > 0 && request.cleanup) {
			console.log(`[${label}] Running cleanup before attempt ${attempt + 1}`)

			try {
				await performRequestWithExponentialBackoff(
					{
						title: `${label} (cleanup)`,
						params: request.cleanup.params,
					},
					{},
					{ maxRetries: 3 }
				)
				console.log(`[${label}] Cleanup completed`)
			} catch (e) {
				console.log(`[${label}] Cleanup failed: ${e.message}, continuing anyway`)
			}
		}

		// First attempt is immediate, second attempt is immediate,
		// then exponential backoff: 1s, 2s, 4s, ...
		if (attempt >= 2) {
			const delay = Math.pow(2, attempt - 2) * 1000
			console.log(
				`[${label}] Waiting ${delay}ms before attempt ${attempt + 1}`
			)
			await new Promise((resolve) => setTimeout(resolve, delay))
		}

		console.log(`[${label}] Attempt ${attempt + 1}/${maxRetries}`)
		const startTime = Date.now()

		const response = await performSingleRequest(request, requestsPayload)

		const duration = Date.now() - startTime

		// For content requests: non-200 on first request means server timed out
		// Record safe duration and continue chunked flow as part of same attempt
		if (response.status !== 200 && isContentRequest) {
			console.log(
				`[${label}] Attempt ${attempt + 1} got HTTP ${response.status}, server likely timed out (took ${duration}ms)`
			)

			// Calculate safe duration: 70% of request time
			const safeDuration = Math.floor((duration * 0.7) / 1000)
			console.log(
				`[${label}] Using safe duration: ${safeDuration}s for subsequent requests`
			)

			// Run cleanup before continuing chunked flow
			if (request.cleanup) {
				console.log(`[${label}] Running cleanup before chunked flow`)

				try {
					await performRequestWithExponentialBackoff(
						{
							title: `${label} (cleanup)`,
							params: request.cleanup.params,
						},
						{},
						{ maxRetries: 3 }
					)
					console.log(`[${label}] Cleanup completed`)
				} catch (e) {
					console.log(`[${label}] Cleanup failed: ${e.message}, continuing anyway`)
				}
			}

			let currentPayload = requestsPayload

			// Continue chunked import as part of same attempt
			while (true) {
				console.log(`[${label}] Continuing chunked import...`)

				const chunkResponse = await performSingleRequest(
					request,
					currentPayload,
					{ duration: safeDuration }
				)

				if (chunkResponse.status !== 200) {
					console.log(
						`[${label}] Chunked import failed: HTTP ${chunkResponse.status}, restarting attempt`
					)
					break
				}

				let chunkBody

				try {
					chunkBody = await chunkResponse.json()
				} catch (e) {
					console.log(
						`[${label}] Chunked import failed: Invalid JSON response, restarting attempt`
					)
					break
				}

				if (!chunkBody || !chunkBody.success) {
					const errorMsg = chunkBody?.data?.message || 'Unknown error'
					console.log(
						`[${label}] Chunked import failed: ${errorMsg}, restarting attempt`
					)
					break
				}

				// Another timeout - update payload and continue
				if (chunkBody.data?.status === 'content_import_timeout_reached') {
					console.log(
						`[${label}] Chunk completed, more content remaining (processed: ${chunkBody.data.total_processed}/${chunkBody.data.total_posts})`
					)

					currentPayload = {
						...currentPayload,
						importer_data: chunkBody.data.importer_data,
					}

					continue
				}

				// Success - content import complete
				console.log(`[${label}] Chunked import complete`)

				let nextPayload = currentPayload

				if (
					chunkBody.data &&
					chunkBody.data != null &&
					chunkBody.data.constructor.name === 'Object'
				) {
					nextPayload = {
						...currentPayload,
						...chunkBody.data,
					}
				}

				return {
					success: true,
					data: chunkBody.data,
					requestsPayload: nextPayload,
				}
			}

			// Chunked flow failed, restart attempt
			attempt++
			continue
		}

		if (response.status !== 200) {
			console.log(
				`[${label}] Attempt ${attempt + 1} failed: HTTP ${
					response.status
				} (took ${duration}ms)`
			)
			attempt++
			continue
		}

		let body

		try {
			body = await response.json()
		} catch (e) {
			console.log(
				`[${label}] Attempt ${
					attempt + 1
				} failed: Invalid JSON response (took ${duration}ms)`
			)
			attempt++
			continue
		}

		if (!body || !body.success) {
			const errorMsg = body?.data?.message || 'Unknown error'
			console.log(
				`[${label}] Attempt ${
					attempt + 1
				} failed: ${errorMsg} (took ${duration}ms)`
			)
			attempt++
			continue
		}

		// Normal success
		console.log(
			`[${label}] Success on attempt ${attempt + 1} (took ${duration}ms)`
		)

		let nextPayload = requestsPayload

		if (
			body.data &&
			body.data != null &&
			body.data.constructor.name === 'Object'
		) {
			nextPayload = {
				...requestsPayload,
				...body.data,
			}
		}

		return {
			success: true,
			data: body.data,
			requestsPayload: nextPayload,
		}
	}

	console.log(`[${label}] All ${maxRetries} attempts failed`)
	throw new Error(GENERIC_MESSAGE)
}
