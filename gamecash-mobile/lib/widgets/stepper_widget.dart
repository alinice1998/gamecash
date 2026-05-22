// lib/widgets/stepper_widget.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class StepperWidget extends StatefulWidget {
  final double value;
  final double step;
  final double min;
  final double max;
  final String label;
  final String suffix;
  final ValueChanged<double> onChanged;

  const StepperWidget({
    Key? key,
    required this.value,
    this.step = 1000.0,
    this.min = 0.0,
    this.max = 9999999.0,
    this.label = '',
    this.suffix = 'ل.س',
    required this.onChanged,
  }) : super(key: key);

  @override
  State<StepperWidget> createState() => _StepperWidgetState();
}

class _StepperWidgetState extends State<StepperWidget> {
  late TextEditingController _controller;
  late FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value.toStringAsFixed(0));
    _focusNode = FocusNode();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void didUpdateWidget(covariant StepperWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value && !_focusNode.hasFocus) {
      _controller.text = widget.value.toStringAsFixed(0);
    }
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (!_focusNode.hasFocus) {
      _validateAndSubmit(_controller.text);
    }
  }

  void _validateAndSubmit(String text) {
    double parsedVal = double.tryParse(text) ?? widget.value;
    if (parsedVal < widget.min) parsedVal = widget.min;
    if (parsedVal > widget.max) parsedVal = widget.max;

    _controller.text = parsedVal.toStringAsFixed(0);
    widget.onChanged(parsedVal);
  }

  void _increment() {
    double newVal = widget.value + widget.step;
    if (newVal > widget.max) newVal = widget.max;
    _controller.text = newVal.toStringAsFixed(0);
    widget.onChanged(newVal);
  }

  void _decrement() {
    double newVal = widget.value - widget.step;
    if (newVal < widget.min) newVal = widget.min;
    _controller.text = newVal.toStringAsFixed(0);
    widget.onChanged(newVal);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label.isNotEmpty) ...[
          Text(
            widget.label,
            style: const TextStyle(
              color: Color(0xB3FFFFFF),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
        ],
        Container(
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFF1E2132),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: const Color(0xFF00D2FF).withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              // Minus Button
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _decrement,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(9),
                    bottomLeft: Radius.circular(9),
                  ),
                  child: Container(
                    width: 48,
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.remove,
                      color: Color(0xFF00D2FF),
                      size: 20,
                    ),
                  ),
                ),
              ),
              const VerticalDivider(
                color: Color(0x33FFFFFF),
                width: 1,
                thickness: 1,
              ),
              // Input Field
              Expanded(
                child: TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    suffixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
                    suffixIcon: Padding(
                      padding: const EdgeInsets.only(left: 12, right: 4),
                      child: Text(
                        widget.suffix,
                        style: const TextStyle(
                          color: Color(0x80FFFFFF),
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                  onSubmitted: _validateAndSubmit,
                ),
              ),
              const VerticalDivider(
                color: Color(0x33FFFFFF),
                width: 1,
                thickness: 1,
              ),
              // Plus Button
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _increment,
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(9),
                    bottomRight: Radius.circular(9),
                  ),
                  child: Container(
                    width: 48,
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.add,
                      color: Color(0xFF00D2FF),
                      size: 20,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
